import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = "ZikitEvaluaciones";

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function clamp(n, max) {
  n = Number(n);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return resp(200, {});
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return resp(400, { error: "JSON invalido" });
  }

  const action = payload.action;

  try {
    if (action === "save") {
      const equipo = String(payload.equipo || "").trim();
      const jurado = String(payload.jurado || "").trim();
      if (!equipo || !jurado) {
        return resp(400, { error: "equipo y jurado son obligatorios" });
      }

      const comprension = clamp(payload.comprension, 20);
      const deteccion = clamp(payload.deteccion, 25);
      const falsas_alarmas = clamp(payload.falsas_alarmas, 15);
      const calidad_tecnica = clamp(payload.calidad_tecnica, 25);
      const presentacion = clamp(payload.presentacion, 15);
      const total = comprension + deteccion + falsas_alarmas + calidad_tecnica + presentacion;
      const notas = String(payload.notas || "").slice(0, 2000);

      const item = {
        equipo,
        jurado,
        comprension,
        deteccion,
        falsas_alarmas,
        calidad_tecnica,
        presentacion,
        total,
        notas,
        actualizado: new Date().toISOString(),
      };

      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return resp(200, { ok: true, item });
    }

    if (action === "list") {
      const data = await ddb.send(new ScanCommand({ TableName: TABLE }));
      const items = (data.Items || []).sort((a, b) => a.equipo.localeCompare(b.equipo));
      return resp(200, { items });
    }

    return resp(400, { error: "accion desconocida" });
  } catch (err) {
    return resp(500, { error: String(err) });
  }
};
