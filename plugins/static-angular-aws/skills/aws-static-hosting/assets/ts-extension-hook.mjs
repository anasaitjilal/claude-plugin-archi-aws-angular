// Hook de résolution Node pour les scripts qui chargent shared/*.ts sans bundler (validate-data.mjs) :
// les imports relatifs sans extension (« ./catalog-constants », écrits pour TypeScript et Angular)
// sont résolus en « ./catalog-constants.ts ». Enregistré par module.register().
export async function resolve(specifier, context, next) {
  if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier) && context.parentURL?.endsWith('.ts')) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      // pas de fichier .ts : résolution normale
    }
  }
  return next(specifier, context);
}
