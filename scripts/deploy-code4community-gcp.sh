#!/usr/bin/env bash
# Deploy Next.js to Cloud Run and wire Firebase Hosting → code4community26.web.app
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="code4community26"
SERVICE_ID="code4community-app"
REGION="us-east4"
SITE_URL="https://code4community26.web.app"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

# Production Firebase Web config (public client keys)
NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY:-AIzaSyAnMqlekmlRnvyQeujfKoUPIYu8JtBDTDA}"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-code4community26.firebaseapp.com}"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-code4community26}"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-code4community26.firebasestorage.app}"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-698474286096}"
NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID:-1:698474286096:web:0b23171803dac353ec4e95}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$SITE_URL}"
# Public reCAPTCHA v3 site key (App Check in browser). Override via .env.local if needed.
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="${NEXT_PUBLIC_RECAPTCHA_SITE_KEY:-6LfPCPMsAAAAAJoZ0jAGk2KGfA42KptDBhTRgz2J}"

DEPLOY_ID="${NEXT_DEPLOYMENT_ID:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
BUILD_ENV="NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY},NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN},NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID},NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID},NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID},NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL},NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY},NEXT_DEPLOYMENT_ID=${DEPLOY_ID}"

RUNTIME_ENV="$BUILD_ENV"

echo "→ gcloud project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "→ Enabling APIs (idempotent)"
gcloud services enable run.googleapis.com firebasehosting.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --quiet

echo "→ Deploying Cloud Run service: $SERVICE_ID ($REGION) [Node.js buildpack, no Dockerfile]"
gcloud run deploy "$SERVICE_ID" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 20 \
  --port 8080 \
  --set-build-env-vars "$BUILD_ENV" \
  --set-env-vars "$RUNTIME_ENV" \
  --set-secrets "WRITING_CENTER_GOOGLE_FORM_SYNC_SECRET=writing-center-google-form-sync:latest,FIREBASE_SERVICE_ACCOUNT_JSON=firebase-service-account-json:latest"

echo "→ Deploying Firebase Hosting (rewrites to Cloud Run)"
if npx -y firebase-tools@latest deploy --only hosting --project "$PROJECT_ID" --non-interactive 2>/dev/null; then
  echo "   (firebase CLI)"
else
  echo "   Firebase CLI auth unavailable — using Hosting REST API"
  bash "$ROOT/scripts/deploy-hosting-rest.sh"
fi

echo ""
echo "Done. Open: $SITE_URL"
echo "Cloud Run: https://${SERVICE_ID}-$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)').${REGION}.run.app"
