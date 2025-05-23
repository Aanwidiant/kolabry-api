import { Hono } from "hono";
import { protect, isKOLManager } from "../middlewares/index.js";
import { kol } from "../controllers/index.js";

const kols = new Hono();

kols.post("/", protect, isKOLManager, (c) => kol.createKol(c));
kols.get("/", protect, isKOLManager, (c) => kol.getKols(c));
kols.patch("/", protect, isKOLManager, (c) => kol.updateKol(c));
kols.delete("/:id", protect, isKOLManager, (c) => kol.deleteKol(c));

export default kols;
