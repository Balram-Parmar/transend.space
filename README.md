**Website**: [https://transends.space](https://transends.space)

---

Transends.space is a modern, fast (high-performance), open-source application for securely sharing files and messages across devices on your local network.

The key features are:

- **Fast**: Very high performance, utilizing the absolute maximum bandwidth of your local router or hotspot. Transfer gigabytes in seconds.
- **Fully Offline**: Operates entirely on your Local Area Network (LAN). No internet connection or third-party servers required.
- **Secure**: End-to-End Encrypted transfers using a robust REST API and HTTPS encryption. Your data never leaves your network.
- **Cross-platform**: Native feel on **Windows**, **macOS**, and **Linux** (thanks to Electron).
- **Intuitive**: Designed to be easy to use. Auto-discovery finds your nearby devices instantly. Less time pairing, more time sharing.
- **Unrestricted**: No file size limits, no media compression. Share exactly what you want, how you want it.

- transfer speeds depend heavily on the capability of your local network hardware.

## Sponsors

### Keystone Sponsor

### Gold Sponsors

[Become a sponsor]()

## Opinions

"_I'm using **Transends.space** a ton these days. It has completely replaced my need for carrying around USB drives in the office. It just works, every single time._"

---

"_We adopted the **Transends** protocol to quickly move massive RAW video files between our editing bays without clogging up our cloud storage bandwidth._"

---

## Requirements

Transends.space stands on the shoulders of giants:

- [Electron]() for the cross-platform desktop framework.
- [React]() for the user interface.
- Node.js for the local network magic.

## Installation

You can download the compiled binaries for your operating system directly from our Releases page, or install via package managers:

```console
# For macOS (Homebrew)
$ brew install --cask transends-space

# For Windows (Winget)
$ winget install transends-space

---> 100%

```

## Building from Source

### Clone it

Clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/transends-space.git
cd transends-space
npm install

```

If your workflow uses `yarn`, run:

```bash hl_lines="3"
git clone https://github.com/your-username/transends-space.git
cd transends-space
yarn install

```

### Run it

Start the development server with:

```console
$ npm start

 ╭────────── Transends.space - Development ──────────╮
 │                                                     │
 │  Electron app launched successfully               │
 │                                                     │
 │  Listening for local devices on port 53317        │
 │                                                     │
 ╰───────────────────────────────────────────────────╯

INFO:     Will watch for changes in main process.
INFO:     Auto-discovery initialized (Multicast DNS).
INFO:     Found 2 devices nearby.

```

### Check it

Open the app on two different devices connected to the same Wi-Fi network.

- The devices will auto-discover each other.
- Select a file on Device A.
- Click on Device B's name in the UI.

### Beautiful UI

You will see the intuitive, modern interface showing nearby devices:

### Lightning Fast Transfers

Watch the progress bar fly as your files transfer over the local network:

## Recap

In summary, with Transends.space you get:

- **Zero configuration:** No accounts to create, no IP addresses to type manually.
- **Maximum privacy:** No data passes through the internet.
- **Cross-compatibility:** Send from your Windows PC to your MacBook seamlessly.

We just scratched the surface, but you already get the idea of how it all works. For a more complete overview, see the [Documentation]().

## License

This project is licensed under the terms of the MIT license.
