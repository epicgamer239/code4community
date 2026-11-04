"use client";

import { useId, useRef, useState } from "react";
import {
  FieldError,
  Notice,
  btnPrimary,
  inputClass,
  labelClass,
} from "@/components/school-forum/ui";
import {
  CONCERN_CATEGORIES,
  CONCERN_CATEGORY_LABELS,
  IDENTITY_NOTICE,
  LIMITS,
  POSTING_RULES,
} from "@/lib/school-forum/constants";
import { forumFetch } from "@/lib/school-forum/forumClient";

const CATEGORY_HINTS = {
  [CONCERN_CATEGORIES.SCHOOL]: "Something our school's staff or administration could change.",
  [CONCERN_CATEGORIES.DISTRICT]: "Needs LCPS (the district) to decide or pay for it.",
  [CONCERN_CATEGORIES.OUTSIDE]: "Outside the school's control, like state rules or county roads.",
};

/**
 * Posting form. The identity notice and the rules sit above the fields so they're read first.
 * @param {{ user: any, onPosted: () => void }} props
 */
export default function PostConcernForm({ user, onPosted }) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef(null);

  const ids = {
    title: `${id}-title`,
    titleErr: `${id}-title-error`,
    titleHint: `${id}-title-hint`,
    body: `${id}-body`,
    bodyErr: `${id}-body-error`,
    bodyHint: `${id}-body-hint`,
    categoryErr: `${id}-category-error`,
    agree: `${id}-agree`,
    agreeErr: `${id}-agree-error`,
  };

  const validate = () => {
    const errs = {};
    if (title.trim().length < LIMITS.TITLE_MIN) {
      errs.title = `Give your concern a short title (at least ${LIMITS.TITLE_MIN} characters).`;
    }
    if (body.trim().length < LIMITS.BODY_MIN) {
      errs.body = `Describe the concern in a bit more detail (at least ${LIMITS.BODY_MIN} characters).`;
    }
    if (!category) errs.category = "Choose who could fix this.";
    if (!agreed) errs.agree = "Confirm that your post follows the posting rules.";
    return errs;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) {
      setFormError("Please fix the highlighted fields.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      await forumFetch(user, "/concerns", { method: "POST", body: { title, body, category } });
      setTitle("");
      setBody("");
      setCategory("");
      setAgreed(false);
      onPosted();
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      setFormError(err.message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  };

  const describedBy = (...parts) => parts.filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby={`${id}-identity`}>
        {formError ? (
          <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none">
            <p className="font-semibold">{formError}</p>
            {Object.keys(fieldErrors).length ? (
              <ul className="mt-1 list-disc pl-5">
                {fieldErrors.title ? <li><a className="underline" href={`#${ids.title}`}>{fieldErrors.title}</a></li> : null}
                {fieldErrors.category ? <li><a className="underline" href={`#${id}-cat-${CONCERN_CATEGORIES.SCHOOL}`}>{fieldErrors.category}</a></li> : null}
                {fieldErrors.body ? <li><a className="underline" href={`#${ids.body}`}>{fieldErrors.body}</a></li> : null}
                {fieldErrors.agree ? <li><a className="underline" href={`#${ids.agree}`}>{fieldErrors.agree}</a></li> : null}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div>
          <label htmlFor={ids.title} className={labelClass}>
            Title <span className="font-normal text-slate-700">(required)</span>
          </label>
          <p id={ids.titleHint} className="text-sm text-slate-700">
            A short summary, like &quot;Water fountains by the gym don&apos;t work&quot;.
          </p>
          <input
            id={ids.title}
            type="text"
            value={title}
            maxLength={LIMITS.TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={describedBy(ids.titleHint, fieldErrors.title && ids.titleErr)}
            required
            className={`${inputClass} mt-1`}
          />
          <FieldError id={ids.titleErr} message={fieldErrors.title} />
        </div>

        <fieldset aria-describedby={fieldErrors.category ? ids.categoryErr : undefined}>
          <legend className={labelClass}>
            Who could fix this? <span className="font-normal text-slate-700">(required)</span>
          </legend>
          <div className="mt-2 space-y-2">
            {Object.values(CONCERN_CATEGORIES).map((value) => (
              <div key={value} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <input
                  id={`${id}-cat-${value}`}
                  type="radio"
                  name={`${id}-category`}
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                  aria-describedby={`${id}-cat-${value}-hint`}
                  className="mt-1 h-4 w-4 accent-blue-700"
                />
                <div>
                  <label htmlFor={`${id}-cat-${value}`} className="text-sm font-semibold text-foreground">
                    {CONCERN_CATEGORY_LABELS[value]}
                  </label>
                  <p id={`${id}-cat-${value}-hint`} className="text-sm text-slate-700">
                    {CATEGORY_HINTS[value]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <FieldError id={ids.categoryErr} message={fieldErrors.category} />
        </fieldset>

        <div>
          <label htmlFor={ids.body} className={labelClass}>
            Describe the concern <span className="font-normal text-slate-700">(required)</span>
          </label>
          <p id={ids.bodyHint} className="text-sm text-slate-700">
            Where and when does it happen, and how does it affect students? {body.length}/{LIMITS.BODY_MAX} characters.
          </p>
          <textarea
            id={ids.body}
            rows={6}
            value={body}
            maxLength={LIMITS.BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={Boolean(fieldErrors.body)}
            aria-describedby={describedBy(ids.bodyHint, fieldErrors.body && ids.bodyErr)}
            required
            className={`${inputClass} mt-1`}
          />
          <FieldError id={ids.bodyErr} message={fieldErrors.body} />
        </div>

        <div>
          <div className="flex items-start gap-3">
            <input
              id={ids.agree}
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              aria-invalid={Boolean(fieldErrors.agree)}
              aria-describedby={fieldErrors.agree ? ids.agreeErr : undefined}
              className="mt-1 h-4 w-4 accent-blue-700"
            />
            <label htmlFor={ids.agree} className="text-sm text-foreground">
              My post follows the posting rules and doesn&apos;t name or target any student or staff member.
            </label>
          </div>
          <FieldError id={ids.agreeErr} message={fieldErrors.agree} />
        </div>

        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? "Sending…" : "Send for review"}
        </button>
      </form>

      <aside className="space-y-4">
        <section id={`${id}-identity`} aria-labelledby={`${id}-identity-heading`} className="rounded-2xl border-2 border-blue-700 bg-blue-50 p-4">
          <h2 id={`${id}-identity-heading`} className="text-base font-bold text-blue-950">
            Who can see that you posted this
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-950">
            {IDENTITY_NOTICE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={`${id}-rules-heading`} className="rounded-2xl border border-border bg-slate-50 p-4">
          <h2 id={`${id}-rules-heading`} className="text-base font-bold text-foreground">
            Posting rules
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
            {POSTING_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
        <Notice kind="info">
          <strong>Worried about someone&apos;s safety?</strong> Don&apos;t wait for the forum. Talk to a counselor
          or trusted adult today. In an emergency, call 911.
        </Notice>
      </aside>
    </div>
  );
}
