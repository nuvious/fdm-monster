import { User } from "../../models";
import { NotFoundException, InternalServerException } from "../../exceptions/runtime.exceptions";
import { validateInput } from "../../handlers/validators";
import { registerUserRules, newPasswordRules } from "../validators/user-service.validation";
import { ROLES } from "../../constants/authorization.constants";
import { hashPassword, comparePasswordHash } from "../../utils/crypto.utils";

export class UserService {
  /**
   * @type {RoleService}
   */
  roleService;

  constructor({ roleService }) {
    this.roleService = roleService;
  }

  /**
   * @private
   * @param user
   * @returns {{createdAt, roles, name, id, username}}
   */
  toDto(user) {
    return {
      id: user.id,
      createdAt: user.createdAt,
      username: user.username,
      name: user.name,
      roles: user.roles,
    };
  }

  async listUsers(limit = 10) {
    const userDocs = await User.find().limit(limit);
    return userDocs.map((u) => this.toDto(u));
  }

  async findRawByRoleId(roleId) {
    return User.find({ roles: { $in: [roleId] } });
  }

  async getDemoUserId() {
    return (await User.findOne({ isDemoUser: true }))?._id;
  }

  async findRawByUsername(username) {
    return User.findOne({
      username,
    });
  }

  async getUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    return this.toDto(user);
  }

  async getUserRoles(userId) {
    const user = await this.getUser(userId);
    return user.roles;
  }

  async setUserRoleIds(userId: string, roleIds): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const roles = this.roleService.getManyRoles(roleIds);

    user.roles = roles.map((r) => r.id);
    user.roles = Array.from(new Set(user.roles));

    return await user.save();
  }

  async deleteUser(userId) {
    // Validate
    const user = await this.getUser(userId);
    const role = this.roleService.getRoleByName(ROLES.ADMIN);

    if (user.roles.includes(role.id)) {
      const administrators = await this.findRawByRoleId(role.id);
      if (administrators?.length === 1) {
        throw new InternalServerException("Cannot delete the last user with ADMIN role.");
      }
    }

    await User.findByIdAndDelete(user.id);
  }

  async updateUsernameById(userId, newUsername) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    user.username = newUsername;
    return await user.save();
  }

  async updatePasswordById(userId, oldPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    if (!comparePasswordHash(oldPassword, user.passwordHash)) {
      throw new NotFoundException("User old password incorrect");
    }

    const { password } = await validateInput({ password: newPassword }, newPasswordRules);
    user.passwordHash = hashPassword(password);
    user.needsPasswordChange = false;
    return await user.save();
  }

  async updatePasswordUnsafe(username, newPassword) {
    const { password } = await validateInput({ password: newPassword }, newPasswordRules);
    const passwordHash = hashPassword(password);
    const user = await this.findRawByUsername(username);
    if (!user) throw new NotFoundException("User not found");

    user.passwordHash = passwordHash;
    user.needsPasswordChange = false;
    return await user.save();
  }

  async register(input) {
    const { username, password, roles, isDemoUser, isRootUser, needsPasswordChange } = await validateInput(
      input,
      registerUserRules
    );

    const passwordHash = hashPassword(password);
    const userDoc = await User.create({
      username,
      passwordHash,
      roles,
      isDemoUser: isDemoUser ?? false,
      isRootUser: isRootUser ?? false,
      needsPasswordChange: needsPasswordChange ?? true,
    });

    return this.toDto(userDoc);
  }
}