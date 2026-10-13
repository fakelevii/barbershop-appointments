const express = require('express');
const User = require('../models/User');
const { hashPassword, verifyPassword, issueToken, readToken } = require('./security');
const { fail, string, email, password } = require('../lib/http');
const publicUser = user => ({ _id: user._id, name: user.name, email: user.email, role: user.role });
function authTools(secret) {
  const router = express.Router();
  const cookie = (res, user) => res.cookie('session', issueToken(user, secret), {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 3600000
  });
  async function authenticate(req, res, next) {
    try {
      const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('session='));
      if (!part) fail(401, 'Please log in');
      const claims = readToken(decodeURIComponent(part.slice(8)), secret);
      const user = await User.findById(claims.sub);
      if (!user || !user.active || claims.version !== user.tokenVersion) fail(401, 'Please log in again');
      req.user = user;
      next();
    } catch { res.status(401).json({ message: 'Please log in again' }); }
  }
  const role = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
  router.post('/register', async(req,res) => {
    const data = { name: string(req.body.name,'name'), email: email(req.body.email), passwordHash: await hashPassword(password(req.body.password)), role: 'customer' };
    const user = await User.create(data);
    cookie(res,user);
    res.status(201).json(publicUser(user));
  });
  router.post('/login', async(req,res) => {
    const address = email(req.body.email);
    if (typeof req.body.password !== 'string' || Buffer.byteLength(req.body.password) > 72) fail(400,'Invalid password');
    const user = await User.findOne({ email: address }).select('+passwordHash');
    if (!user || !user.active || !await verifyPassword(req.body.password,user.passwordHash)) fail(401,'Incorrect email or password');
    cookie(res,user);
    res.json(publicUser(user));
  });
  router.post('/logout', authenticate, async(req,res) => {
    await User.updateOne({_id:req.user._id},{$inc:{tokenVersion:1}});
    res.clearCookie('session',{path:'/',httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production'});
    res.json({message:'Logged out'});
  });
  return { router, authenticate, role, publicUser };
}
module.exports = { authTools };
