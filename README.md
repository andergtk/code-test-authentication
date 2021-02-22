# Code Test - Authentication

Simple JSON API using Node.js v6 to authenticate users and control access to resources:

## POST /signup

Request:

    {
      "email": "user@example.com",
      "name": "User Name",
      "password": "123"
    }

Response headers:

    status: 204
    authentication: <authentication-token>

## POST /login

Request:

    {
      "email": "user@example.com",
      "password": "123"
    }

Response headers:

    status: 204
    authentication: <authentication-token>

## POST /logout

Request headers:

    authentication: <authentication-token>

Response headers:

    status: 204

## Download

```sh
git clone https://github.com/andergtk/code-test-authentication.git
```

## Tests

Run tests using Docker:

```sh
npm run test:container
```

Run tests locally:

```sh
npm test
```