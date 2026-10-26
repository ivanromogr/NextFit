# Compatibilidad de la mitigación local de node-forge

Revisión del 26 de octubre de 2026. Es evidencia adicional de compatibilidad,
no una versión oficial corregida ni una aprobación de publicación.

## Fuente y aislamiento

- Repositorio original: https://github.com/digitalbazaar/forge
- Tag `v1.4.0`, commit `fa385f92440879601240020f158bed68e444e83a`.
- Copia de revisión: `/workspace/nextfit-setup/forge-upstream-review`.
- El hash SHA-256 de `lib/rsa.js` original coincide con el que valida nuestro
  instalador: `fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50`.
- Las pruebas se ejecutan en un proceso sin variables de credenciales de Render,
  Vercel, PostgreSQL, Expo ni proveedores. No se usa una identidad de firma real.
  La aplicación y su lockfile no reciben dependencias nuevas de esta revisión.

## Selección completa de pruebas

La suite original incluye `describe.only('jsbn', ...)` en `tests/unit/jsbn.js`.
Una primera ejecución seleccionó solo cinco pruebas y se descartó como evidencia
de la suite completa. En la copia aislada se cambia únicamente ese selector a
`describe('jsbn', ...)`, sin cambiar ninguna aserción. Ambas pasadas siguientes
usan `--forbid-only` para evitar otra selección silenciosa.

Se ejecuta el runner de la rama original, Mocha 5.2.0, sin instalar su cadena
completa de herramientas ni incorporarlo al proyecto:

```sh
NODE_ENV=test npm exec --yes --package=mocha@5.2.0 -- \
  mocha --forbid-only -t 30000 -R json tests/unit/index.js
```

## Comparación

| Variante | Pruebas seleccionadas | Correctas | Omitidas | Fallos |
|---|---:|---:|---:|---:|
| Fuente original, selector `.only` neutralizado | 832 | 828 | 4 | 0 |
| Misma fuente y selector, con la guardia RSA de NextFit | 832 | 828 | 4 | 0 |

La segunda pasada cambia solo `lib/rsa.js`. Se verificó que revertir exactamente
la guardia devuelve el archivo original completo; no se sustituyeron otros
componentes. Se compararon también los títulos de todas las pruebas y las cuatro
omitidas: inventario idéntico en ambas pasadas. Las omisiones pertenecen a pruebas
upstream de generación determinista de claves, no se añadieron para este cambio.

La suite incluye RSA, ASN.1, certificados X.509, CSR, PKCS, TLS y otros módulos del
paquete. Se mantienen además las cuatro regresiones propias, incluidas firma
malformada, firmas válidas y el consumidor real de firma Expo.

Informes locales:

- `/tmp/nextfit-forge-upstream-baseline-full.json`
- `/tmp/nextfit-forge-upstream-patched-full.json`

Estas pruebas de una biblioteca externa **no se suman** a las 1.050 pruebas de
aplicación registradas. No demuestran ausencia de otras vulnerabilidades ni
sustituyen la corrección oficial del aviso
[GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
La auditoría móvil conserva sus seis avisos altos y la mitigación local permanece
fijada por versión y hash hasta una actualización revisada.
