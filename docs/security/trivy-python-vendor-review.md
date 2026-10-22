# Revisión de hallazgos Python vendorizados por pip

**Fecha:** 2026-10-21

**Alcance:** los cuatro hallazgos HIGH reportados por Trivy 0.76.0 en `pywi:security-amd64` y `pywi:security-arm64`, más los hallazgos MEDIUM descubiertos al repetir el escaneo amd64 con la base de vulnerabilidades actualizada.

## Evidencia del escaneo

- **amd64:** reconstruí la imagen desde el `Dockerfile` actual y escaneé `pywi:security-amd64` con Trivy 0.76.0. El JSON se guardó temporalmente en `/dev/shm/pywi-security-amd64.json`; el resumen persistente está en este documento.
- **arm64:** el log CI compartido el 2026-10-21 muestra los mismos cuatro HIGH, con las mismas versiones y versiones corregidas. No pude repetir localmente el build ni capturar su JSON: el filesystem raíz del host llegó a 0 bytes disponibles después del build amd64. Por ello, la evidencia arm64 de este informe es el log CI aportado, no un escaneo local independiente.
- El Dockerfile es multi-stage y ambas plataformas usan el mismo stage Python runtime. La arquitectura cambia dependencias nativas de Node; los cuatro componentes Python son código Python vendorizado. Esto explica la paridad observada, pero no sustituye el JSON arm64 pendiente.

Comandos utilizados en amd64:

```sh
docker buildx build --platform linux/amd64 --tag pywi:security-amd64 --file Dockerfile --load .

docker run --rm \
  --tmpfs /trivy-cache:rw,size=2g \
  --tmpfs /tmp:rw,size=2g \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /dev/shm:/out \
  -e TRIVY_CACHE_DIR=/trivy-cache \
  aquasec/trivy:0.76.0 image \
  --scanners vuln --list-all-pkgs --format json \
  --output /out/pywi-security-amd64.json pywi:security-amd64
```

El escaneo JSON completo encontró 4 HIGH y 2 MEDIUM en `python-pkg`. El log CI original enumera los cuatro HIGH y muestra Debian y Node sin hallazgos. La repetición amd64 encontró además CVE-2026-59890 y CVE-2026-97688 como MEDIUM.

## Inventario: paquete instalado frente a BOM de pip

El JSON identifica estos paquetes con `FilePath: null` y `BOMRef` igual a su PURL. Son entradas del BOM embebido de pip, no distribuciones Python instaladas como paquetes independientes. En cambio, el mismo JSON encuentra `pip 26.2.2` en `app/.venv/lib/python3.11/site-packages/pip-26.2.2.dist-info/METADATA` y `setuptools 84.2.1` en su propio `.dist-info/METADATA`.

| Componente reportado | Versión en BOM | PURL / BOMRef | Clasificación de inventario |
|---|---:|---|---|
| msgpack | 1.1.2 | `pkg:pypi/msgpack@1.1.2` | Vendorizado por pip; sin `FilePath` |
| setuptools | 70.3.0 | `pkg:pypi/setuptools@70.3.0` | Versión declarada por el BOM; sin distribución setuptools 70.3.0 instalada |
| urllib3 | 2.7.0 | `pkg:pypi/urllib3@2.7.0` | Vendorizado por pip; sin `FilePath` |
| pip instalado | 26.2.2 | `pkg:pypi/pip@26.2.2` | `.venv` real |
| setuptools instalado | 84.2.1 | `pkg:pypi/setuptools@84.2.1` | `.venv` real |

El Dockerfile ejecuta `.venv/bin/pip install --upgrade pip setuptools` antes de instalar `requirements.txt` ([Dockerfile:59-61](../../Dockerfile#L59)). La versión real de setuptools encontrada es 84.2.1, superior a las correcciones de CVE-2025-47273 y CVE-2026-59890. El BOM de pip sigue declarando setuptools 70.3.0 porque `pip/_vendor/vendor.txt` conserva esa versión de referencia; el README de pip explica que setuptools se recorta para conservar únicamente `pkg_resources`.

## Disposición por hallazgo

| Hallazgo | Versión afectada → corregida | Disposición | Evidencia y consecuencia |
|---|---|---|---|
| [GHSA-6v7p-g79w-8964](https://github.com/advisories/GHSA-6v7p-g79w-8964), msgpack 1.1.2, HIGH | `1.1.2` → `1.2.1` | **not affected** | El advisory trata la reutilización de un `Unpacker` después de un error. pip usa `msgpack.dumps()` y `msgpack.loads()` de una sola operación en `pip/_vendor/cachecontrol/serialize.py`; no usa `Unpacker`. El valor deserializado corresponde a la caché HTTP local de pip. Es candidato a VEX limitado a ese PURL y advisory. [Análisis de Trivy](https://github.com/aquasecurity/trivy/discussions/11031), [política de seguridad de pip](https://github.com/pypa/pip/security). |
| [CVE-2025-47273](https://github.com/advisories/GHSA-5rjg-fvgr-3xxf), setuptools 70.3.0, HIGH | `70.3.0` → `78.1.1` | **not affected** | El fallo vive en `setuptools.package_index.PackageIndex.download`. pip no incluye ese módulo: su README dice que setuptools está recortado para conservar solo `pkg_resources`. La distribución instalada es setuptools 84.2.1; 70.3.0 aparece solo como metadato de BOM. Es candidato a VEX limitado a ese PURL y advisory. [README vendorizado de pip 26.2.2](https://github.com/pypa/pip/blob/26.2.2/src/pip/_vendor/README.rst), [advisory](https://github.com/advisories/GHSA-5rjg-fvgr-3xxf). |
| [CVE-2026-97687](https://github.com/advisories/GHSA-8988-9cw3-xx77), urllib3 2.7.0, HIGH | `2.7.0` → `2.8.0` | **unresolved; tratar como afectado hasta actualizar** | pip configura `ProxyManager` para usar su contexto TLS tanto en la conexión al destino como en la conexión TLS al proxy ([session.py](https://github.com/pypa/pip/blob/26.2.2/src/pip/_internal/network/session.py#L240-L250)). El advisory requiere combinaciones de proxy HTTPS y parámetros TLS específicos. No hay evidencia de la configuración de proxy de los despliegues ni se reprodujo esa combinación; por eso no se justifica VEX. La actualización de urllib3 debe incluir este caso hasta verificarlo. |
| [CVE-2026-97689](https://github.com/advisories/GHSA-vxq7-64xx-v4gw), urllib3 2.7.0, HIGH | `2.7.0` → `2.8.0` | **affected** | pip descarga artefactos mediante requests con `stream=True`; requests transmite usando `HTTPResponse.stream()`. Un índice o servidor comprometido puede responder con `Transfer-Encoding: chunked` y una línea de tamaño maliciosamente larga. La ruta vulnerable de streaming está presente y se usa durante instalaciones. [Descarga de pip](https://github.com/pypa/pip/blob/26.2.2/src/pip/_internal/network/download.py), [advisory](https://github.com/advisories/GHSA-vxq7-64xx-v4gw). |
| [CVE-2026-59890](https://avd.aquasec.com/nvd/cve-2026-59890), setuptools 70.3.0, MEDIUM (escaneo amd64 actualizado) | `70.3.0` → `83.0.0` | **not affected** | Tiene el mismo origen que CVE-2025-47273: el módulo setuptools vulnerable no está incluido en pip y la versión 70.3.0 solo aparece en el BOM. [Análisis de Trivy](https://github.com/aquasecurity/trivy/discussions/11031). |
| [CVE-2026-97688](https://github.com/advisories/GHSA-gh4c-6fx4-qh6g), urllib3 2.7.0, MEDIUM (escaneo amd64 actualizado) | `2.7.0` → `2.8.0` | **not affected en la ruta normal de descarga de pip** | pip envía `Accept-Encoding: identity` y lee el cuerpo con `response.raw.stream(..., decode_content=False)`. Eso evita que urllib3 entre al decodificador deflate que requiere el advisory. Es candidato a VEX limitado a este PURL y advisory. [Código de descarga de pip](https://github.com/pypa/pip/blob/26.2.2/src/pip/_internal/network/utils.py#L19-L39), [lectura de chunks](https://github.com/pypa/pip/blob/26.2.2/src/pip/_internal/network/utils.py#L67-L83), [advisory](https://github.com/advisories/GHSA-gh4c-6fx4-qh6g). |

La política de pip indica que un problema en una biblioteca vendorizada cuenta para pip cuando el uso de pip queda afectado; la existencia de una versión vulnerable en el BOM, por sí sola, no prueba explotabilidad. Para CVE-2026-97689 y CVE-2026-97688 sí existe una ruta de descarga transmitida. No se deben excluir junto con todo el BOM.

## Relación con PyWI

`server.ts` invoca pip para consultar paquetes, listar actualizaciones, instalar, actualizar y desinstalar; además actualiza pip al preparar un entorno virtual ([server.ts:362-429](../../server.ts#L362)). El Dockerfile también crea el entorno inicial con pip. Por ello, cualquier política de versión fija o migración de instalador deberá cubrir tanto el build como el flujo de entornos Python creados durante la ejecución.

## Decisión de instalador (tarea 2)

La versión más reciente de pip publicada al 2026-10-21 es 26.2.2 (publicada el 20 de octubre); su `vendor.txt` todavía fija `urllib3==2.7.0`. El `vendor.txt` de `main` también conserva 2.7.0, por lo que fijar otro pip disponible no elimina los HIGH de urllib3. [PyPI pip](https://pypi.org/project/pip/), [inventario de pip 26.2.2](https://github.com/pypa/pip/blob/26.2.2/src/pip/_vendor/vendor.txt), [inventario actual de main](https://github.com/pypa/pip/blob/main/src/pip/_vendor/vendor.txt).

La migración implementada usa `uv pip` para instalar, listar paquetes en JSON, consultar `--outdated`, actualizar y desinstalar. `uv venv` crea el entorno sin sembrar pip por defecto; PyWI pasa el intérprete del entorno con `--python`. El binario `uv 0.13.1` está publicado como imagen multi-arquitectura y quedó fijado al digest del índice OCI. La CLI de uv elimina paquetes directamente, así que el flujo no necesita la opción `--yes` específica de pip. [Comandos de uv](https://docs.astral.sh/uv/reference/cli/), [inspección JSON](https://docs.astral.sh/uv/pip/inspection/), [entornos Python](https://docs.astral.sh/uv/pip/environments/), [uv en Docker](https://docs.astral.sh/uv/guides/integration/docker/).

El código y el Dockerfile ya usan uv; todavía no se ha reconstruido ni escaneado la imagen resultante. El filesystem raíz del host sigue sin espacio disponible, así que quedan pendientes la validación de compilación y los dos escaneos de arquitectura. No se añadió VEX: primero hay que comprobar si, al no instalar pip en la imagen, Trivy deja de reportar su BOM.

La tarea 3 debe reevaluarse después del escaneo de la imagen migrada: los hallazgos de pip podrían desaparecer sin VEX al no instalarse pip en el entorno runtime. Si el escáner conserva entradas de BOM, solo GHSA-6v7p-g79w-8964, setuptools y CVE-2026-97688 tienen evidencia de `not affected`; CVE-2026-97687 queda fuera de VEX hasta resolver sus condiciones de uso.

## Fuentes principales

- [pip 26.2.2, inventario de dependencias vendorizadas](https://github.com/pypa/pip/blob/26.2.2/src/pip/_vendor/vendor.txt)
- [README de vendorización de pip 26.2.2](https://github.com/pypa/pip/blob/26.2.2/src/pip/_vendor/README.rst)
- [Política de seguridad de pip](https://github.com/pypa/pip/security)
- [Investigación de Trivy sobre el BOM de pip](https://github.com/aquasecurity/trivy/discussions/11031)
- [CVE-2026-97687](https://github.com/advisories/GHSA-8988-9cw3-xx77), [CVE-2026-97689](https://github.com/advisories/GHSA-vxq7-64xx-v4gw), [CVE-2026-97688](https://github.com/advisories/GHSA-gh4c-6fx4-qh6g)
