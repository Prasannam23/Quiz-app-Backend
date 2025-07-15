import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Redirect to Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Callback route
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: true,
  }),
  (req, res) => {
    // You can redirect to your frontend
    res.redirect('http://localhost:3000/dashboard');
  }
);

// Optional: Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send("Logout error");
    res.redirect('/');
  });
});

export default router;
