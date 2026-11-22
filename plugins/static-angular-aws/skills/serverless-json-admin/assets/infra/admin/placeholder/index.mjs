// Code provisoire déployé par Terraform. Remplacé par admin-api/ au premier passage de
// .github/workflows/admin-api.yml (ou à la main : voir infra/admin/README.md).
export const handler = async () => ({
  statusCode: 503,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    code: 'NOT_DEPLOYED',
    message: "L'API d'administration n'est pas encore déployée.",
  }),
});
