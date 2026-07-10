FROM alpine:latest

ARG PB_VERSION=0.39.4

RUN apk add --no-cache unzip ca-certificates wget

WORKDIR /pb

RUN wget -O /tmp/pocketbase.zip \
    https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip /tmp/pocketbase.zip -d /pb \
    && rm /tmp/pocketbase.zip \
    && chmod +x /pb/pocketbase

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090"]
