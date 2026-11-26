const POWERBI_URL = "https://wabi-paas-1-scus-api.analysis.windows.net/public/reports/querydata?synchronous=true";
const RESOURCE_KEY = "d959e760-42b8-4e9a-8a41-de0d6ca8f8ce";
const CACHE_KEY = "mined_ce_catalog_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en caché

export class CeCatalogService {
  constructor() {
    this.catalog = [];
    this.isLoaded = false;
  }

  async loadCatalog() {
    // 1. Intentar leer desde localStorage primero
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items) && parsed.items.length > 0 && Date.now() - parsed.savedAt < CACHE_TTL_MS) {
          this.catalog = parsed.items;
          this.isLoaded = true;
          return this.catalog;
        }
      }
    } catch (e) {
      console.warn("No se pudo leer caché local de CEs:", e);
    }

    // 2. Descargar listado completo desde el endpoint oficial de Power BI
    try {
      const payload = {
        version: "1.0.0",
        queries: [
          {
            Query: {
              Commands: [
                {
                  SemanticQueryDataShapeCommand: {
                    Query: {
                      Version: 2,
                      From: [{ Name: "c", Entity: "CE_2024", Type: 0 }],
                      Select: [
                        {
                          Column: {
                            Expression: { SourceRef: { Source: "c" } },
                            Property: "Infra_y_Nombre_CE"
                          },
                          Name: "CE_2024.Infra_y_Nombre_CE"
                        }
                      ],
                      OrderBy: [
                        {
                          Direction: 1,
                          Expression: {
                            Column: {
                              Expression: { SourceRef: { Source: "c" } },
                              Property: "Infra_y_Nombre_CE"
                            }
                          }
                        }
                      ]
                    },
                    Binding: {
                      Primary: { Groupings: [{ Projections: [0] }] },
                      DataReduction: { DataVolume: 3, Primary: { Top: { Count: 30000 } } },
                      Version: 1
                    }
                  }
                }
              ]
            },
            ApplicationContext: {
              DatasetId: "1286915e-8f7f-487f-bae3-73a9e488c456",
              Sources: [{ ReportId: "243201a2-4a9e-4f70-9997-ed23d079ba3f", VisualId: "9e229e8ff2abde49259a" }]
            }
          }
        ],
        cancelQueries: [],
        modelId: 3759890
      };

      const res = await fetch(POWERBI_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json;charset=UTF-8",
          "X-PowerBI-ResourceKey": RESOURCE_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const items = this.parsePowerBIResponse(json);
      if (items.length > 0) {
        this.catalog = items;
        this.isLoaded = true;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
      }
      return this.catalog;
    } catch (err) {
      console.error("Error descargando catálogo oficial de CEs:", err);
      // Fallback a caché expirado si existiera
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.catalog = parsed.items || [];
        this.isLoaded = this.catalog.length > 0;
      }
      return this.catalog;
    }
  }

  parsePowerBIResponse(json) {
    const ds = json?.results?.[0]?.result?.data?.dsr?.DS?.[0];
    if (!ds) return [];

    // Power BI puede devolver los textos en PH[0].DM0 o en ValueDicts.D0
    const dict = ds.ValueDicts?.D0 || [];
    const rows = ds.PH?.[0]?.DM0 || [];
    const rawStrings = [];

    if (dict.length > 0) {
      dict.forEach((val) => {
        if (typeof val === "string") rawStrings.push(val);
      });
    } else {
      rows.forEach((row) => {
        const val = row.G0 ?? row.C?.[0];
        if (typeof val === "string") rawStrings.push(val);
      });
    }

    const parsedList = [];
    const seenCodes = new Set();

    rawStrings.forEach((fullText) => {
      // Formato: "10007 CENTRO ESCOLAR CARLOTA LEON VIUDA DE TRIGUEROS, AHUACHAPAN, AHUACHAPAN CENTRO, AHUACHAPAN"
      const match = fullText.trim().match(/^(\d{5})\s+(.+)$/);
      if (!match) return;

      const codigo = match[1];
      if (seenCodes.has(codigo)) return;
      seenCodes.add(codigo);

      const rest = match[2];
      const commaIdx = rest.indexOf(",");
      const nombre = commaIdx !== -1 ? rest.slice(0, commaIdx).trim() : rest.trim();
      const ubicacion = commaIdx !== -1 ? rest.slice(commaIdx + 1).trim() : "";

      parsedList.push({
        codigo,
        nombre,
        ubicacion,
        fullText
      });
    });

    return parsedList;
  }

  search(query) {
    const normalize = (str) =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const q = normalize(query.trim());
    if (!q) return [];

    return this.catalog
      .filter((ce) => normalize(ce.fullText).includes(q))
      .slice(0, 15);
  }
}