

export const validateIsLoggedIn = (request, h) => {
  if (!request.auth.isAuthenticated) {
    // return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);

    const response = { message: 'Forbidden', code: "xemp-1" };
    const code = 401;

    return { error: true, response, code }
  }
  if (!request.auth.artifacts.decoded.active) {
    const response = { message: 'User not active' };
    const code = 401;

    return { error: true, response, code };

    // return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
    // return h.response({ message: 'User not active' }).code(401);
  }

  return { error: false };
}

export const validateIsNotLoggedIn = (request, h) => {
  if (request.auth.isAuthenticated) {
    const response = { message: 'Forbidden' };
    const code = 401;

    return { error: true, response, code };
    // return h.response({ message: 'Forbidden' }).code(401);
  }

  return { error: false };
}