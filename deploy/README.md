# AllHands Web — OCI Deployment Guide

This app runs as a single container (FastAPI + WebSocket + static React build). OCI Container Instances is the recommended deployment target because attendee interaction requires WebSockets and a live backend.

## Architecture on OCI

```
Internet
   │
   ▼
OCI Load Balancer (optional, for TLS + scaling)
   │
   ▼
OCI Container Instance
   ├── FastAPI (API + WebSocket)
   ├── React static files
   └── Ephemeral volume OR Object Storage mount for sessions
```

For production at scale, move generated slide assets to **OCI Object Storage** and keep session metadata in **Autonomous JSON DB** or **OCI NoSQL**.

## Prerequisites

- OCI tenancy with Container Instances enabled
- OCIR (Oracle Container Registry) repository
- OCI CLI configured (`oci setup config`)
- Terraform 1.5+ (optional)

## 1. Build and push image to OCIR

```bash
# From repo root
docker build -f deploy/Dockerfile -t allhands-web:latest .

# Tag for OCIR (replace region, tenancy namespace, repo name)
docker tag allhands-web:latest <region>.ocir.io/<tenancy-namespace>/allhands-web:latest

# Login to OCIR
docker login <region>.ocir.io

# Push
docker push <region>.ocir.io/<tenancy-namespace>/allhands-web:latest
```

## 2. Deploy with Terraform

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your OCIDs and image URL

terraform init
terraform plan
terraform apply
```

Terraform creates:
- VCN with public subnet
- Network Security Group (ports 80/443/8000)
- Container Instance running the app
- Optional Object Storage bucket for slide assets

## 3. Custom domain and TLS

1. Create an OCI Load Balancer in front of the Container Instance
2. Add a TLS certificate (OCI Certificates or Let's Encrypt)
3. Point DNS `allhands.yourcompany.com` to the load balancer IP
4. Set `CORS_ORIGINS=https://allhands.yourcompany.com`

## 4. Environment variables

| Variable | Description |
|----------|-------------|
| `DATA_DIR` | Path for session JSON and uploads (use mounted volume in prod) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `HOST_KEY` | Secret for presenter-only admin actions (future use) |

## 5. Object Storage for static assets (optional enhancement)

For large decks with many images:

1. Upload `data/sessions/{id}/assets/*` to a public or PAR-protected bucket
2. Set asset URLs in `session.json` to Object Storage URLs
3. Use OCI CDN or API Gateway as a facade for custom domains

See [Oracle docs: Static website hosting with Object Storage + API Gateway](https://docs.oracle.com/en/learn/static-websites-to-cloudflare/index.html).

## 6. Scaling for large all-hands

- **Container Instances**: 1–2 OCPUs, 2–4 GB RAM handles hundreds of concurrent WebSocket connections
- **Load Balancer**: Required for multiple container replicas; enable sticky sessions for WebSockets
- **Autonomous DB**: Replace in-memory WebSocket state for multi-instance deployments

## Local Docker test

```bash
cd deploy
docker compose up --build
```

Open http://localhost:8000 (serve frontend via reverse proxy in production; locally use Vite dev server on :5173).
