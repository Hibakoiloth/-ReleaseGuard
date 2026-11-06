import { authRepository } from "./auth.repository";
import { ValidationError, UnauthorizedError } from "../../shared/errors";

export const authService = {
  async signup(username: string, password: string) {
    if (!username || username.length < 3) throw new ValidationError("Username must be at least 3 characters");
    if (!password || password.length < 6) throw new ValidationError("Password must be at least 6 characters");

    const existing = await authRepository.findUserByUsername(username);
    if (existing) throw new ValidationError("Username already taken");

    const user = await authRepository.createUser(username, password);
    const token = await authRepository.createSession(user.id);
    return { token, userId: user.id, username: user.username };
  },

  async login(username: string, password: string) {
    const user = await authRepository.findUserByUsername(username);
    if (!user) throw new UnauthorizedError("Invalid username or password");

    const valid = authRepository.verifyPassword(password, user.password);
    if (!valid) throw new UnauthorizedError("Invalid username or password");

    const token = await authRepository.createSession(user.id);
    return { token, userId: user.id, username: user.username };
  },

  async logout(token: string): Promise<void> {
    await authRepository.deleteSession(token);
  },
};
