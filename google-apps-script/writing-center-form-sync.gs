/**
 * Writing Center — sync Google Form submissions to Code4Community.
 *
 * Setup: docs/writing-center-google-form.md
 * Requires Google Forms API enabled + forms.responses.readonly scope (re-authorize after changes).
 */

function onFormSubmit(e) {
  if (!e) {
    console.error("No event object. Add an On form submit trigger and test by submitting the form.");
    return;
  }

  var props = PropertiesService.getScriptProperties();
  var syncUrl = props.getProperty("WC_SYNC_URL");
  var secret = props.getProperty("WC_SYNC_SECRET");

  if (!syncUrl || !secret) {
    console.error("Set WC_SYNC_URL and WC_SYNC_SECRET in Script properties.");
    return;
  }

  var fields = {};
  var responseId;
  var submittedAt;
  var formResponse = null;

  if (e.response) {
    formResponse = e.response;
    formResponse.getItemResponses().forEach(function (item) {
      fields[item.getItem().getTitle()] = item.getResponse();
    });
    responseId = formResponse.getId();
    submittedAt = formResponse.getTimestamp().toISOString();
  } else if (e.namedValues) {
    var named = e.namedValues;
    for (var key in named) {
      if (!named.hasOwnProperty(key)) continue;
      var val = named[key];
      fields[key] = Array.isArray(val) ? val.join(", ") : String(val);
    }
    var row = e.range ? e.range.getRow() : 0;
    responseId = "sheet-row-" + row + "-" + new Date().getTime();
    submittedAt = new Date().toISOString();
    formResponse = findFormResponseForSheetRow_(e, fields);
    if (formResponse) {
      responseId = formResponse.getId() || responseId;
      submittedAt = formResponse.getTimestamp().toISOString();
    }
  } else {
    console.error("Unexpected trigger event.");
    return;
  }

  var link = resolveFormResponseLink_(submittedAt, fields, props);

  var payload = {
    responseId: responseId,
    submittedAt: submittedAt,
    fields: fields,
    googleFormId: link.formId,
    googleFormApiResponseId: link.apiResponseId,
    googleFormResponseUrl: link.url,
  };

  var res = UrlFetchApp.fetch(syncUrl, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    console.error("Sync failed (" + code + "): " + res.getContentText());
  } else if (!link.apiResponseId) {
    console.error(
      "Synced session but no Forms API responseId — enable Google Forms API for this script's " +
        "GCP project and re-authorize. Link will not open a specific response."
    );
  }
}

function resolveFormResponseLink_(submittedAtIso, fields, props) {
  var formId = getFormId_(props);
  if (!formId) {
    console.error(
      "Set Script property WC_FORM_ID (e.g. 1nRtpON5vn7gNOgWaMjcK7v9Fh1EXPkZXsXuUUL1sZDE)."
    );
    return { formId: "", apiResponseId: "", url: "" };
  }

  var submittedAt = submittedAtIso ? new Date(submittedAtIso) : new Date();
  var email = pickEmailFromFields_(fields);
  var apiResponseId = lookupFormsApiResponseIdWithRetry_(formId, submittedAt, email);

  if (apiResponseId) {
    return {
      formId: formId,
      apiResponseId: apiResponseId,
      url:
        "https://docs.google.com/forms/d/" +
        formId +
        "/edit#response=" +
        apiResponseId,
    };
  }

  return { formId: formId, apiResponseId: "", url: "" };
}

/** Retries — Forms API may lag a few seconds after submit. */
function lookupFormsApiResponseIdWithRetry_(formId, submittedAt, email) {
  var attempts = 5;
  for (var i = 0; i < attempts; i++) {
    if (i > 0) Utilities.sleep(2000);
    var id = lookupFormsApiResponseIdOnce_(formId, submittedAt, email);
    if (id) return id;
  }
  return null;
}

function lookupFormsApiResponseIdOnce_(formId, submittedAt, email) {
  var data = listFormResponses_(formId, submittedAt);
  if (!data || !data.responses || !data.responses.length) return null;

  var responses = data.responses.slice().sort(function (a, b) {
    return (
      new Date(b.lastSubmittedTime).getTime() - new Date(a.lastSubmittedTime).getTime()
    );
  });

  var targetMs = submittedAt.getTime();

  if (email) {
    for (var i = 0; i < responses.length; i++) {
      var r = responses[i];
      if (
        r.respondentEmail &&
        String(r.respondentEmail).toLowerCase() === email
      ) {
        var emailDelta = Math.abs(new Date(r.lastSubmittedTime).getTime() - targetMs);
        if (emailDelta < 600000) return r.responseId;
      }
    }
  }

  var bestId = null;
  var bestDelta = Infinity;
  for (var j = 0; j < responses.length; j++) {
    var resp = responses[j];
    var delta = Math.abs(new Date(resp.lastSubmittedTime).getTime() - targetMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestId = resp.responseId;
    }
  }
  if (bestDelta < 300000) return bestId;

  var newest = responses[0];
  if (
    newest &&
    Math.abs(new Date(newest.lastSubmittedTime).getTime() - Date.now()) < 180000
  ) {
    return newest.responseId;
  }

  return null;
}

/**
 * List responses via Forms REST API + UrlFetchApp (official Google pattern).
 * @see https://developers.google.com/workspace/forms/api/guides/apps-script-setup
 * @see https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list
 */
function listFormResponses_(formId, submittedAt) {
  var url =
    "https://forms.googleapis.com/v1/forms/" +
    encodeURIComponent(formId) +
    "/responses?pageSize=25";

  if (submittedAt) {
    var from = new Date(submittedAt.getTime() - 120000);
    var iso = from.toISOString().replace(/\.\d{3}Z$/, "Z");
    url += "&filter=" + encodeURIComponent("timestamp >= " + iso);
  }

  var res = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken(),
      Accept: "application/json",
    },
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    var body = res.getContentText();
    console.error("Forms API (" + res.getResponseCode() + "): " + body);
    if (body.indexOf("ACCESS_TOKEN_SCOPE_INSUFFICIENT") !== -1) {
      console.error(
        "Missing forms.responses.readonly — update appsscript.json, run authorizeFormsApiAccess(), re-authorize."
      );
    }
    return null;
  }

  return JSON.parse(res.getContentText());
}

/** Form editor ID — avoids FormApp.openByUrl (needs full forms scope on spreadsheets). */
function getFormId_(props) {
  var id = (props.getProperty("WC_FORM_ID") || "").trim();
  if (id) return id;

  try {
    var form = FormApp.getActiveForm();
    if (form) return form.getId();
  } catch (err) {
    // Expected when script is bound to spreadsheet only
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    id = parseFormIdFromUrl_(ss.getFormUrl());
    if (id) return id;
  } catch (err2) {}

  return "";
}

function parseFormIdFromUrl_(url) {
  if (!url) return "";
  var match = String(url).match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : "";
}

function findFormResponseForSheetRow_(e, fields) {
  var form = null;
  try {
    var active = FormApp.getActiveForm();
    if (active) form = active;
  } catch (err) {}
  if (!form) return null;
  if (!e.range) return null;

  var responses = form.getResponses();
  var rowIndex = e.range.getRow() - 2;
  if (rowIndex >= 0 && rowIndex < responses.length) {
    return responses[rowIndex];
  }

  var email = pickEmailFromFields_(fields);
  if (!email) return responses.length ? responses[responses.length - 1] : null;

  for (var i = responses.length - 1; i >= 0; i--) {
    var items = responses[i].getItemResponses();
    for (var j = 0; j < items.length; j++) {
      var title = (items[j].getItem().getTitle() || "").toLowerCase();
      if (title.indexOf("email") !== -1 && String(items[j].getResponse()).toLowerCase() === email) {
        return responses[i];
      }
    }
  }
  return responses.length ? responses[responses.length - 1] : null;
}

/**
 * Run once from the editor (not the trigger) after updating appsscript.json scopes.
 * Forces a new authorization dialog including Forms API access.
 */
function authorizeFormsApiAccess() {
  var props = PropertiesService.getScriptProperties();
  var formId = getFormId_(props);
  if (!formId) {
    throw new Error(
      "Add Script property WC_FORM_ID = 1nRtpON5vn7gNOgWaMjcK7v9Fh1EXPkZXsXuUUL1sZDE " +
        "(Project settings → Script properties), Save, then run this again."
    );
  }
  var data = listFormResponses_(formId, new Date());
  if (!data) {
    throw new Error(
      "Forms API call failed (403 = re-authorize after adding forms.responses.readonly to appsscript.json)."
    );
  }
  Logger.log("Forms API OK. Response count: " + (data.responses ? data.responses.length : 0));
}

function pickEmailFromFields_(fields) {
  var keys = ["lcps email", "school email", "student email", "email address", "your email", "email"];
  for (var i = 0; i < keys.length; i++) {
    for (var title in fields) {
      if (!fields.hasOwnProperty(title)) continue;
      if (title.toLowerCase().indexOf(keys[i]) !== -1) {
        var v = String(fields[title] || "").trim().toLowerCase();
        if (v) return v;
      }
    }
  }
  return "";
}
