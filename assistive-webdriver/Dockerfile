FROM node:12-buster-slim as builder
WORKDIR /opt/app
ADD package.json yarn.lock /opt/app/
RUN ["yarn", "--frozen-lockfile", "--ignore-scripts"]
ADD . /opt/app/
RUN ["yarn", "prepare"]

FROM node:12-buster-slim
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install -y qemu-kvm nano && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /opt/app
ADD package.json yarn.lock /opt/app/
RUN ["yarn", "--frozen-lockfile", "--ignore-scripts", "--production"]
COPY --from=builder /opt/app/dist/ /opt/app/dist
ENTRYPOINT []
CMD ["yarn", "start"]
EXPOSE 3000
ENV AWD_HOST=0.0.0.0 AWD_PORT=3000 QEMU_AUDIO_DRV=none
