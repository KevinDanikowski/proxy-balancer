const Balancer = require('../lib/balancer.js');
const { expect } = require('chai');
const http = require('http');
const utils = require('./utils.js');

const ports = [
  4001,
  4002,
  4003,
  4004
]

describe('Proxy Balancer', () => {
  let servers;
  before(done => {
    servers = ports.map(port => utils.createProxyServer().listen(port));
    done();
  });

  after(done => {
    for(const server of servers) {
      server.close();
    }
    done();
  })

  it('should populate proxies using proxyFn', (done) => {
    const balancer = new Balancer({
      proxyFn() {
        return ports.map(port => 'http://127.0.0.1:' + port);
      }
    });

    balancer.getProxies().then(proxies => {
      for(const port of ports) {
        expect(proxies).to.deep.include('http://127.0.0.1:' + port);
      }
      done();
    });
  });

  it('should use new proxy on each request - round robin', async () => {
    const balancer = new Balancer({
      proxyFn() {
        return ports.map(port => 'http://127.0.0.1:' + port);
      }
    });

    const first = await balancer.getNext();
    const second = await balancer.getNext();

    expect(first).to.equal('http://127.0.0.1:' + ports[0]);
    expect(second).to.equal('http://127.0.0.1:' + ports[1]);
  });

  it('should send request using proxy', (done) => {
    const balancer = new Balancer({
      proxyFn() {
        return ports.map(port => 'http://127.0.0.1:' + port);
      }
    });

    http.createServer((req, res) => {
      res.writeHead(200, {'Content-type':'text/plan'});
      res.write('test');
      res.end();
    }).listen(80);

    balancer.request('http://127.0.0.1:80')
      .then(res => res.text())
      .then(body => {
        expect(body).to.equal('test')
        done();
      })
  });
});