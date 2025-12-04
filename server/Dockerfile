FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ unixodbc-dev && rm -rf /var/lib/apt/lists/*

COPY package*.json /app/
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm","run","server"]