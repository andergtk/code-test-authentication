/* eslint-disable no-underscore-dangle */
/* eslint-disable no-shadow */
/* eslint-disable global-require */
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const expect = chai.expect;

chai.use(chaiHttp);

let app;
let authorization;
const userAttrs = {
  email: `strongbad${new Date().getTime()}@gmail.com`,
  name: 'Strong Bad',
  password: 'thecheat',
};

// connect to Mongoose
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

function checkConnection() {
  console.log('Connection status: ', {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    4: 'unauthorized',
    99: 'uninitialized',
  }[mongoose.connection.readyState]);
}

describe('server', () => {
  before(done => {
    checkConnection();
    mongoose.connection.on('connected', () => {
      // eslint-disable-next-line import/newline-after-import
      app = require('../index');
      checkConnection();
      done();
    });
  });

  describe('POST /signup', () => {
    it('should create a new User', done => {
      chai.request(app)
        .post('/signup')
        .send(userAttrs)
        .end((err, res) => {
          expect(res.status).to.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.not.equal(undefined);
          authorization = res.headers.authorization;
          done();
        });
    });

    it('should fail creating an existing User', done => {
      chai.request(app)
        .post('/signup')
        .send(userAttrs)
        .end((err, res) => {
          expect(res.status).to.not.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should faild to create a new User without data', done => {
      chai.request(app)
        .post('/signup')
        .send({})
        .end((err, res) => {
          expect(res.status).to.not.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });
  });

  describe('POST /login', () => {
    it('should return an authorization header', done => {
      chai.request(app)
        .post('/login')
        .send(userAttrs)
        .end((err, res) => {
          expect(res.status).to.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.not.equal(undefined);
          authorization = res.headers.authorization;
          done();
        });
    });

    it('should not return an authorization header when no data provided', done => {
      chai.request(app)
        .post('/login')
        .end((err, res) => {
          expect(res.status).to.not.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should not return an authorization header with incorrect email', done => {
      chai.request(app)
        .post('/login')
        .send({ email: 'emailnot@register.com', password: userAttrs.password })
        .end((err, res) => {
          expect(res.status).to.not.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should not return an authorization header with incorrect password', done => {
      chai.request(app)
        .post('/login')
        .send({ email: userAttrs.email, password: 'anotherpassword' })
        .end((err, res) => {
          expect(res.status).to.not.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });
  });

  describe('POST /logout', () => {
    it('should remove the authorization header', done => {
      chai.request(app)
        .post('/logout')
        .set('authorization', authorization)
        .end((err, res) => {
          expect(res.status).to.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should fail logout twice with same authorization header', done => {
      chai.request(app)
        .post('/logout')
        .set('authorization', authorization)
        .end((err, res) => {
          expect(res.status).to.not.equal(204);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });
  });

  describe('/album', () => {
    it('should return 401 when without authorization', done => {
      chai.request(app)
        .get('/albums')
        .end((err, res) => {
          expect(res.status).to.equal(401);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should return 401 when with invalid authorization', done => {
      chai.request(app)
        .get('/albums')
        .set('authorization', 'someinvalidauthorization')
        .end((err, res) => {
          expect(res.status).to.equal(401);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should get all albums when authorization is valid', done => {
      chai.request(app)
        .post('/login')
        .send(userAttrs)
        .end((err, res) => {
          authorization = res.headers.authorization;
          chai.request(app)
            .get('/albums')
            .set('authorization', authorization)
            .end((err, res) => {
              expect(res.status).to.not.equal(401);
              expect(res.body.data).to.not.equal(undefined);
              expect(res.headers.authorization).to.not.equal(undefined);
              done();
            });
        });
    });

    it('should create album when authorization is valid', done => {
      chai.request(app)
        .post('/albums')
        .send({
          performer: 'Any Name',
          title: 'The Album Title',
          cost: 100,
        })
        .set('authorization', authorization)
        .end((err, res) => {
          expect(res.status).to.not.equal(401);
          expect(res.body.data).to.not.equal(undefined);
          expect(res.headers.authorization).to.not.equal(undefined);
          done();
        });
    });

    it('should not create album without authorization', done => {
      chai.request(app)
        .post('/albums')
        .send({
          performer: 'Any Name',
          title: 'The Album Title',
          cost: 100,
        })
        .end((err, res) => {
          expect(res.status).to.equal(401);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should not create album with invalid authorization', done => {
      chai.request(app)
        .post('/albums')
        .send({
          performer: 'Any Name',
          title: 'The Album Title',
          cost: 100,
        })
        .set('authorization', 'someinvalidauthorization')
        .end((err, res) => {
          expect(res.status).to.equal(401);
          expect(res.body.data).to.equal(undefined);
          expect(res.headers.authorization).to.equal(undefined);
          done();
        });
    });

    it('should delete album', done => {
      chai.request(app)
        .post('/albums')
        .send({
          performer: 'Any Name',
          title: 'The Album Title',
          cost: 100,
        })
        .set('authorization', authorization)
        .end((err, res) => {
          const album = res.body.data;
          chai.request(app)
            .delete(`/albums/${album._id}`)
            .set('authorization', authorization)
            .end((err, res) => {
              expect(res.status).to.equal(204);
              // expect(res.body.data).to.not.equal(undefined);
              expect(res.headers.authorization).to.equal(authorization);
              done();
            });
        });
    });

    it('should not delete album without authorization', done => {
      chai.request(app)
        .post('/albums')
        .send({
          performer: 'Any Name',
          title: 'The Album Title',
          cost: 100,
        })
        .set('authorization', authorization)
        .end((err, res) => {
          const album = res.body.data;
          chai.request(app)
            .delete(`/albums/${album._id}`)
            .set('authorization', 'invalidauthorization')
            .end((err, res) => {
              expect(res.status).to.equal(401);
              expect(res.body.data).to.equal(undefined);
              expect(res.headers.authorization).to.equal(undefined);
              done();
            });
        });
    });
  });
});
