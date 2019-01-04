FROM node:10

COPY . /etc/pangolin

RUN cd /etc/pangolin \
    && npm install \
    && chmod +x ./bin/index.js \
    && ln -s /etc/pangolin/bin/index.js /usr/local/bin/pangolin

EXPOSE 10000
EXPOSE 10001

ENTRYPOINT ["pangolin"]
