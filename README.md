# Carbon VPN/Proxy Setup

### Server
The server runs on Caddy. If you already have another web server like Apache installed, you will need to modify your settings to run on alternate ports and probably domains as well.

Start off by installing Catty with the `http.forwardproxy` plugin with the following command.

`curl https://getcaddy.com | bash -s personal http.forwardproxy`

Allow catty to use the correct ports with this command:

`sudo setcap cap_net_bind_service=+ep ./caddy`

Give the server some working room:

`sudo ulimit -n 8192`

You will need to create a service for Catty to run at startup, so create a `catty.service` file (in your home directory).

I use the following configuration as it works best for me:

    [Unit]
    Description=Caddy HTTP/2 web server
    Documentation=https://caddyserver.com/docs
    After=network-online.target
    Wants=network-online.target systemd-networkd-wait-online.service
    
    [Service]
    Restart=on-abnormal
    LimitNOFILE=16384
    
    EnvironmentFile=/etc/default/caddy
    
    ExecStart=/usr/local/bin/caddy -log stdout -agree=true -conf=${CONFIG_FILE} -root=${ROOT_DIR}
    ExecReload=/bin/kill -USR1 $MAINPID
    
    ; Use graceful shutdown with a reasonable timeout
    KillMode=mixed
    KillSignal=SIGQUIT
    TimeoutStopSec=5s
    
    [Install]
    WantedBy=multi-user.target

You'll need to create the file referenced in the service `/etc/default/caddy`. Inside you will need to include the following code **MAKE SURE TO USE VALUES THAT MATCH YOUR SETUP**:

    CONFIG_FILE="/etc/caddy/caddyfile"
    DEFAULT_PORT="80"
    ROOT_DIR="/var/www"

You will need to create another new file that was just referenced called `/etc/caddy/caddyfile`. This is an extremely important part of the server, it contains all the main server settings. Here's a skeleton of what mine looks like:

	mydomain.net { # replace this with your domain name
	gzip
	log /var/log/caddy_access.log
	errors /var/log/caddy_error.log
	errors {
	  403 /var/www/403.html # This is optional, but is the page that is shown if a url is blocked (like an internal ip)
	}
	forwardproxy {
	  basic auth YOURPROXYUSERNAME YOURPROXYPASSWORD # Change this to your username and password (make it unique and secure)
	  hide_ip # These two lines hide the proxy from your browser
	  hide_via
	  response_timeout 30 # These two lines set connection timeouts
	  dial_timeout 30
	  acl { # These are the files with hosts you want to specifically allow or deny. If a URL is denied, it will show the 403 error page we set above.
	    allowfile /var/www/allowed.txt
	    denyfile /var/www/blocked.txt
	}
	}



Also, in my case I didn't have the `/var/www` folder created so I did so with:
`sudo mkdir /var/www`

Then you will need to move the service file to the systemd directory with the following command:

`cp caddy.service /etc/systemd/system/caddy.service`

After this you will need to start the service, enable it to startup with the server and check its status.

`sudo systemctl start caddy.service`
`sudo systemctl enable caddy.service`
`sudo systemctl status caddy.service`

If all went well, you should see something like:

    ● caddy.service - Caddy HTTP/2 web server
       Loaded: loaded (/etc/systemd/system/caddy.service; enabled; vendor preset: enabled)
       Active: active (running) since Wed 2020-01-01 12:00:00 GMT; 1min ago
If not, Google away.

You should be mostly set up. One of the last steps is to make sure that you put something like a random jpg that is around 0.5Mb or more on your server to put into the client config. This will allow the calculation of your connection speed. For my server I have a random meme that is an image, and I specified the filename/path in the client config.

### Client
The client currently runs on Google Chrome via a developer extension. Download and unpack the extension dot zip file and put it somewhere safe (so it doesn't get moved). 

Before continuing, you need to open the folder and navigate to `assets/json/config.json` and adjust the host, port, scheme, connection test file, and your credentials to match your server's setup.

**IMPORTANT** : Do not use a main password you use for other websites or services with this VPN, the username and password are stored in plaintext!

Open `chrome://extensions` in Chrome and enable developer mode, then add a unpacked extension and browse to the main folder directory of the extension you just saved. 

That's it! There will now be a icon to the right of the URL bar (if there isn't, you may need to click on the three dots, right click and select "show in toolbar").

When clicking on the icon you will see the current version of Carbon you are using, along with your serial number, username and connection status. You will also see the VPN toggle option that enables or disables the VPN.

Keep in mind that if the credentials you supply in the `config.json` file are incorrect, you will notice a red badge on the Carbon toolbar icon and a notification. This informs you that there was an authentication error and the extension has disabled the VPN. Make sure to review the configuration and verify that the username and password entries match those on the server.

If you want to re-test the connection speed for the connection icon, click on it and another test will be performed. An exclamation point over the symbol indicates that the server and or test file could not be reached, check your client and server settings. One bar indicates speeds < 20mbps, two indicates < 70mbps and three indicates anything higher.

### Make sure to be responsible with this server/extension. This is really only a proof of concept and is still being refined and developed. Don't be stupid and don't do anything illegal of course. Due to the nature of the setup, it is strongly recommended you find more ways to secure your system, as it is probably not hard to take control of your proxy if not secured properly. Remember, if somebody else can connect to your proxy, they can act as if they were sitting on your couch using your WiFi. I also think you should read up on the Caddy documentation along with the http.forward proxy to further your understanding and find options that may better suit your situation.
