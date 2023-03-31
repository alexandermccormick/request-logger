FROM denoland/deno:alpine

WORKDIR /usr/src/app


ADD . .

EXPOSE 8080

CMD ["run", "-A", "src/app.ts"]
