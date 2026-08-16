export default {
  async fetch(request) {
    return Response.json({
      ok: true,
      name: "pg-township",
      path: new URL(request.url).pathname,
    });
  },
};
