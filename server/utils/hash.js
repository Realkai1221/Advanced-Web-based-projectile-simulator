var bcrypt = require('bcrypt');
var crypto = require('crypto');

var SALT_ROUNDS = 10;

async function hashPassword(pw) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

async function comparePassword(input, stored) {
  return bcrypt.compare(input, stored);
}

function generateToken(userId) {
  var payload = userId + '' + Date.now() + crypto.randomBytes(16).toString('hex');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

module.exports = { hashPassword, comparePassword, generateToken };
