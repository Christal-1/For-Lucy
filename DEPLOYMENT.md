# Deployment checklist

The project is intended to run locally first. Before making it public:

- Deploy to a Node.js host that supports persistent writable storage, or migrate product data and uploads to an appropriate managed database/object store.
- Set `NODE_ENV=production` and use HTTPS.
- Configure `trust proxy` only to match the host's proxy setup.
- Replace the default in-memory Express session store with a durable production session store.
- Configure backups and test restoring `storage/products.json` and `uploads/`.
- Use a strong owner password and protect environment variables in the hosting dashboard.
- Confirm the chosen hosting plan supports persistent uploaded files; some serverless hosts do not.
- Test sign-in, sign-out, upload validation, product create/edit/delete and WhatsApp links after deployment.
