const http = require('http');
const { readFile } = require('fs').promises;
const path = require('path');
const { Item } = require('../models');

const hostname = '127.0.0.1';
const port = 8081;

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/images')) {
        const fileExtension = path.extname(req.url);
        const imageType = 'image/' + fileExtension.substring(1);
        const imageFilePath = './assets' + req.url;
        try {
            const imageFileContents = await readFile(imageFilePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', imageType);
            res.end(imageFileContents);
            return;
        } catch {
            res.statusCode = 404;
            res.end();
            return;
        }
    }
    else if (req.url === '/items/new') {
        const htmlFilePath = './views/add-item.html';
        try {
            const htmlFileContents = await readFile(htmlFilePath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(htmlFileContents);
            return;
        } catch {
            res.statusCode = 404;
            res.end();
            return;
        }
    }
    else if (req.url === '/items' && req.method === 'POST') {
        let body = '';
        for await (let chunk of req) {
            body += chunk;
        }
        const keyValuePairs = body.split('&')
        .map(keyValuePair => keyValuePair.split('='))
        .map(([key,value]) => [key, value.replace(/\+/g, ' ')])
        .map(([key,value]) => [key, decodeURIComponent(value)])
        .reduce((accum, [key, value]) => {
            accum[key] = value;
        return accum;
        }, {});
        await Item.create({
            name: keyValuePairs.name,
            description: keyValuePairs.description,
            amount: keyValuePairs.amount
        });
        res.statusCode = 302;
        res.setHeader("location", "/");
        res.end();
        return;
    }

     // Handle post request to use an item of inventory
  if (req.method === 'POST' && req.url.startsWith('/items/')) {
    const pathParts = req.url.split('/');
    const id = Number.parseInt(pathParts[2]);

    if (pathParts[3] === 'used' && !isNaN(id)) {
      // Get the item, reduce the amount, save it
      const item = await Item.findByPk(id);
      item.amount -= 1;
      await item.save();

      // Redirect the browser to "/"
      res.statusCode = 302;
      res.setHeader('Location', '/');
      res.end();
      return;
    }
  }

   // default handler; generate and render list of items
  const items = await Item.findAll({ order: ['name'] });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Inventory</title>
    </head>
    <body>
      <header>
        <div><a href="/items/new">Add a new item</a></div>
      </header>
      <main>
        <table>`);

  for (let item of items) {
    res.write(`
      <tr>
    `);
    if (item.imageName) {
      res.write(`<td><img width="50" src="/images/${item.imageName}"></td>`)
    } else {
      res.write(`<td></td>`)
    }
    res.write(`
      <td>${item.name}</td>
      <td>${item.description}</td>
      <td>${item.amount}</td>
      <td>`);
    if (item.amount > 0) {
      res.write(`
        <form method="post" action="/items/${item.id}/used">
          <button type="submit">Use one</button>
        </form>
      `);
    }
    res.write(`</td>
    </tr>`);
  }

  res.end(`
        </table>
      </main>
    </body>
    </html>`);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
