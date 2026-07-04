#!/usr/bin/env python3
"""
Static file server for local development that disables browser caching
and handles requests concurrently.

Two fixes over plain `http.server`:
1. Cache-Control: no-store on every response — we're actively iterating on
   the JS/CSS here, and browsers can otherwise keep serving a stale script
   after an edit (a normal refresh doesn't always re-fetch JS).
2. Threaded request handling — the stdlib's default HTTPServer handles one
   request at a time. A single page load fires ~20 concurrent requests
   (HTML, CSS, JS, several images); over a tunnel's added latency (see
   root README for sharing this demo publicly), the single-threaded server
   can't keep up and requests start timing out as 502s. ThreadingHTTPServer
   fixes this by handling each request on its own thread.

Usage: py -3.14 serve.py [port]   (defaults to 5500)
"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5500


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(
        HandlerClass=NoCacheHandler,
        ServerClass=http.server.ThreadingHTTPServer,
        port=PORT,
    )
