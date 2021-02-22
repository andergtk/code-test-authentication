/* eslint-disable no-shadow */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const algorithm = 'aes-256-ctr';
const secretKey = 'k3yb04rdC4t';
const encryptionKey = crypto.createHash('sha256').update(secretKey).digest('base64').substr(0, 32);
const encryptionBuffer = Buffer.from(encryptionKey);
const authorizations = {};

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: String,
  password: Buffer,
}));

const Album = mongoose.model('Album', new mongoose.Schema({
  performer: String,
  title: String,
  cost: Number,
}));

const Purchase = mongoose.model('Purchase', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  album: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' },
}));

app.use(bodyParser.json());
app.listen(3000);

function hashedPassword(password) {
  return crypto.createHash('sha256').update(password).digest();
}

function encrypt(email) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionBuffer, iv);
  let encrypted = cipher.update(email);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(authorization) {
  if (authorization.indexOf(':') === -1) {
    return '';
  }

  const textParts = authorization.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(algorithm, encryptionBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function registerAuthorization(email) {
  authorizations[email] = encrypt(email);
  return authorizations[email];
}

function unregisterAuthorization(email) {
  delete authorizations[email];
}

function isAuthenticated(req, res, next) {
  const authorization = req.header('authorization');

  // abort on empty authorization
  if (!authorization) {
    res.sendStatus(401);
    return;
  }

  const email = decrypt(authorization);

  // not yet authorized/logged in
  if (!authorizations[email]) {
    res.sendStatus(401);
    return;
  }

  User.findOne({ email }, (err, user) => {
    // user not found
    if (!user) {
      res.sendStatus(401);
      return;
    }

    delete user.password;
    req.user = user;
    res.header('authorization', authorization);
    next();
  });
}

function isEmpty(value) {
  return value == null || String(value).length === 0;
}

function trim(value) {
  return String(value).trim();
}

app.get('/albums', isAuthenticated, (req, res) => {
  Album.find().exec((err, results) => {
    res.json({ data: results });
  });
});

app.get('/albums/:id', isAuthenticated, (req, res) => {
  Album.findOne({ id: req.id }, (err, album) => {
    res.json({ data: album });
  });
});

app.post('/albums', isAuthenticated, (req, res) => {
  new Album(req.body).save((err, album) => {
    res.json({ data: album });
  });
});

app.put('/albums/:id', isAuthenticated, (req, res) => {
  Album.findOneAndUpdate({ id: req.id }, req.body, { new: true }, (err, album) => {
    res.json({ data: album });
  });
});

app.delete('/albums/:id', isAuthenticated, (req, res) => {
  Album.findOneAndRemove({ id: req.id }, (err) => {
    if (err) {
      res.sendStatus(400);
    } else {
      res.sendStatus(204);
    }
  });
});

app.post('/purchases', (req, res) => {
  new Purchase({ user: req.body.user._id, album: req.body.album._id }).save((err, purchase) => {
    const opts = [{ path: 'user' }, { path: 'album' }];
    Purchase.populate(purchase, opts, (err, purchase) => {
      res.json({ data: purchase });
    });
  });
});

app.post('/signup', (req, res) => {
  const { email, name, password } = req.body;

  // request missing data
  if (isEmpty(email) || isEmpty(name) || isEmpty(password)) {
    res.sendStatus(422);
    return;
  }

  User.findOne({ email }, (err, user) => {
    // abort if give some error
    if (err) {
      res.json(err).status(500);
      return;
    }

    // abort if user already exists
    if (user) {
      res.sendStatus(409); // conflict
      return;
    }

    const data = {
      email: trim(email),
      name: trim(name),
      password: hashedPassword(trim(password)),
    };

    new User(data).save((err2, user2) => {
      if (err2) {
        res.sendStatus(500);
        return;
      }

      user2.password = undefined;
      res.header('authorization', registerAuthorization(data.email));
      res.status(204).json(user2);
    });
  });
});

app.post('/logout', isAuthenticated, (req, res) => {
  unregisterAuthorization(req.user.email);
  res.removeHeader('authorization');
  res.sendStatus(204);
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // request missing data
  if (isEmpty(email) || isEmpty(password)) {
    res.sendStatus(422);
    return;
  }

  const userData = {
    email: trim(email),
    password: hashedPassword(trim(password)),
  };

  User.findOne(userData, (err, user) => {
    // unspected error
    if (err) {
      res.sendStatus(500);
      return;
    }

    // incorrect credentials
    if (!user) {
      res.sendStatus(400);
      return;
    }

    res.header('authorization', registerAuthorization(user.email));
    res.sendStatus(204);
  });
});

module.exports = app;
