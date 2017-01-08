const express = require('express')
const path = require('path')
const base58 = require('base58')
const pg = require('pg')
const url = require('url')

const app = express()

/* poolConfig is taken from the node-postgres documentation, since it doesn't
    read DATABASE_URL directly. */
const params = url.parse(process.env.DATABASE_URL)
const auth = params.auth.split(':')

const poolConfig = {
  user: auth[0],
  password: auth[1],
  host: params.hostname,
  port: params.port,
  database: params.pathname.split('/')[1]
}

const pool = new pg.Pool(poolConfig)

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'))
})

// app.get('/testdb', (req, response) => {
//   pool.query('SELECT * FROM list', (err, result) => {
//     if (err) response.end(err)
//     else response.end(result.rows[0].id + ': ' + result.rows[0].url)
//   })
// })

// app.get('/testpr', (req, response) => {
//   pool.query('SELECT * FROM list')
//     .then((result) => response.end(result.rows[0].id + ' ' + result.rows[0].url))
//     .catch((err) => response.end(err.message))
// })

app.get('/new/*', (request, response) => {
  function send_result (response, original, short) { // Do I need to pass in the response? Probably not.
    response.writeHead(200, {'content-type': 'text/json'})
      const output = {
        "original_url": original,
        "short_url": 'https://kah-fcc-url.herokuapp.com/' + short
      }
    response.end(JSON.stringify(output))
  }

  const url_re = new RegExp('^https?://(\w+\.)+\w+', 'i')
  if (url_re.test(request.params[0])) { 
    const arg_url = request.params[0]
    // Check the database for the url
    // TODO: Clean this up by using the Promise api instead.
    pool.query('SELECT id FROM list WHERE url = $1', [arg_url], (err, result) => {
      if (err) {
        console.log(err.message, err.stack)
        response.writeHead(500, {'content-type': 'text/json'})
        response.end(JSON.stringify({'Error': "An error occured fetching this item from the database."}))
      }

      // If it doesn't exist, add the url to the database
      if (result.rows.length < 1) {
        pool.query('INSERT INTO list (url) VALUES ($1) RETURNING id', [arg_url], (err, result) => {
          if (err) {
            console.log(err.message, err.stack)
            response.writeHead(500, {'content-type': 'text/json'})
            response.end(JSON.stringify({'Error': 'An error occured adding this item to the database.'}))
          }

          send_result(response, arg_url, base58.encode(result.rows[0].id))
        })
      } else {
        send_result(response, arg_url, base58.encode(result.rows[0].id))
      }
    })
    
    // Return a JSON string with the full and short urls
  } else {
    response.writeHead(500, {'content-type': 'text/json'})
    response.end(JSON.stringify({'Error': request.params[0] + ' is not a valid URL.'}))
  }
})

app.get('/:url_id', (request, response) => {
  // If the id is base58, decode it.
  if (!/^[1-9a-km-zA-HJK-NP-Z]*$/.test(request.params.url_id)) {
    response.writeHead(500, {'content-type': 'text/json'})
    response.end(JSON.stringify({'Error': request.params.url_id + ' is not a valid code.'}))
  } else {
    // If the decoded id is in the database, get the url
    const db_id = base58.decode(request.params.url_id)
    pool.query('SELECT * FROM list WHERE id = $1', [db_id])
      .then((result) => {
        if (result.rows.length > 0) {
          // Redirect the browser to the url
          response.redirect(result.rows[0].url)
        } else {
          // If the decoded id is not in the database, return an error message
          response.writeHead(500, {'content-type': 'text/json'})
          response.end(JSON.stringify({'Error': request.params.url_id + ' is not in the database.'}))
        }
      })
      .catch((err) => {
        console.log(err.message, err.stack)
        response.writeHead(500, {'content-type': 'text/json'})
        response.end(JSON.stringify({'Error': 'An error occured'}))
      })
  }
})

const port = process.env.PORT || 5000
app.listen(port)
console.log('Now listening on port ' + port) 