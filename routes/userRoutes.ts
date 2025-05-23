import { Hono } from "hono";
import { protect, isAdmin } from "../middlewares/index.js";
import { user } from "../controllers/index.js";

const users = new Hono();

users.post("/", protect, isAdmin, (c) => user.createUser(c));
users.get("/", protect, isAdmin, (c) => user.getUsers(c));
users.patch("/", protect, (c) => user.updateUser(c));
users.delete("/:id", protect, isAdmin, (c) => user.deleteUser(c));
users.post("/login", (c) => user.loginUser(c));
users.post("/change-password", protect, (c) => user.changePassword(c));

export default users;
