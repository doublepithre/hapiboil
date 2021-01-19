import passport from 'passport';

const authenticate = (req, res, next) => {
  const isAuthenticated = req.isAuthenticated();
  const xtoken = req.query.xtoken || req.headers.xtoken;
  console.log('AUTHENTICATE', isAuthenticated, xtoken);
  if (!isAuthenticated && !xtoken) {
    res.status(401).json({ message: 'Authorization failed' });
  } else {
    if (isAuthenticated) {
      next();
    } else {
      passport.authenticate('token', (err, user, info) => {
        if (err) {
          return next(err);
        }
        console.log('USER', user);
        if (!user) {
          return res.status(401).json({ message: 'Authorization failed' });
        }
        req.user = user;
        next();
      })(req, res, next);
    }
  }
};

module.exports = authenticate;
