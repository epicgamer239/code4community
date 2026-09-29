#!/usr/bin/env bash
# Delete old Cloud Run source images; keep the digest serving production traffic.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-code4community26}"
REGION="${REGION:-us-east4}"
SERVICE_ID="${SERVICE_ID:-code4community-app}"
REPO="cloud-run-source-deploy"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_ID}"

KEEP=$(gcloud run services describe "$SERVICE_ID" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(spec.template.spec.containers[0].image)' | sed 's/.*@//')

echo "Keeping image in use: $KEEP"

deleted=0
while IFS= read -r ver; do
  if [ "$ver" = "$KEEP" ]; then
    continue
  fi
  gcloud artifacts docker images delete "${IMAGE}@${ver}" --quiet --delete-tags --project="$PROJECT_ID"
  deleted=$((deleted + 1))
done < <(gcloud artifacts docker images list "$IMAGE" --format='value(version)' --project="$PROJECT_ID" | sort -u)

echo "Deleted $deleted old image(s)."
