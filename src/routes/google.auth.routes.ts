import { Router, Request, Response } from 'express';
import passport from 'passport';
import { generateToken } from '../util/jwt';
import { CookieOptions } from 'express';
import { AuthUser } from '../types/auth';

const router = Router();

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Redirect to Google for OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));


router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: false,
  }),
  (req: Request, res: Response) => {
    console.log(req)
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return res.redirect('http://localhost:3000/login?error=OAuthFailed');
    }
    console.log("////////////1")

    const token = generateToken({ id: user.id, role: user.role });
    res.cookie('token', token, COOKIE_OPTIONS);
    console.log("////////////1")
    const redirectPath = user.role === 'STUDENT' ? '/student' : '/dashboard';
    return res.redirect(`http://localhost:3000${redirectPath}`);
  }
);

export default router;
