<div align="center">
    <!-- <img src="./image.png" height="128" style="border-radius: 99999px"> -->
</div>
<h1 align="center">Old School RuneScape Bot</h1>
<div align="center">
    <p>Says "repo not found" due to repo being private. Make repo public to fix this</p>
    <a href="https://github.com/JayNightmare/Old-School-RuneScape/graphs/contributors">
      <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/JayNightmare/Old-School-RuneScape?color=2db94d" />
    </a>
    <a href="https://github.com/JayNightmare/Old-School-RuneScape/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/JayNightmare/Old-School-RuneScape?color=0088ff" />
    </a>
    <a href="https://github.com/JayNightmare/Old-School-RuneScape/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/JayNightmare/Old-School-RuneScape?color=0088ff" />
    </a>
    <a href="https://github.com/JayNightmare/Old-School-RuneScape/actions/workflows/node.js.yml">
      <img alt="Node.js CI" src="https://github.com/JayNightmare/Old-School-RuneScape/actions/workflows/node.js.yml/badge.svg"/>
    </a>
    <br/>
</div>

<div align="center">
  <!-- <div>
    <a href="https://top.gg/bot/1278098225353719869">
      <img src="https://top.gg/api/widget/upvotes/1278098225353719869.svg">
    </a>
    <a href="https://discord.com/application-directory/1278098225353719869">
      <p>Discord App Directory</p>
    </a>
  </div> -->
</div>

<br/>

<div align="center">
    <p>Bot was made for Iron Valor Discord Server as a commission. If you want your own custom Discord Bot, contact me via</p> 
</div>

<div align=center>

# BOT READY FOR PRODUCTION

</div>

<div align="center">
    <a href=https://www.fiverr.com/s/bdoQ9mN style="font-size: 45px;  font-weight: bold;">Fiverr</a>
</div>

## Have a bug?

Submit an `Issue` and tell me what's wrong.

## Things to note before cloning

This codebase is uses discord.js, sqlite3, .env, and a few other packages. If you experience a problem with a package, don't blame me.

# How to get working:
1. Do `npm install` to install all dependencies from package.json.
2. Do `node model.js` file to create a database.
3. Fill out `.env`.
4. Run Bot.
   1. Local Machine: Use `Run and Debug` menu. Do NOT just do `node bot.js`, it wont break, you'll just look dumb.
   2. Server Machine: Install pm2 (`npm install pm2 -g`) and do `pm2 start bot.js --name "name of bot"`. This will auto restart the bot if a critical error occurs and allows you to remotely monitor your bot on the [PM2](https://app.pm2.io) website.
  

Optional if running on a Server:

- View Database remotely:
   1. Install python. If you're on a server, good luck. If you're on a local machine, install python.
   2. Open a command line.
   3. Do `pip install sqlite-web`.
   4. Navigate to your db directory and do `sqlite_web your-database-file.db` (You can also do `sqlite_web --port 8080 your-database-file.db` to choose what port it appears on. Default is 8080).

   5. The line `sqlite_web running at http://0.0.0.0:8080/` should appear.
   6. Open another command line.
   7. ssh into that port - `ssh -L 8000:localhost:8080 user@your-server-ip`.
   8. Open a browser or new tab.
   9. Go to `http://localhost:8000` to view your database remotely.
   10. From there, you can modify the data within your database.
