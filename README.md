# Scrape: Power AI, Share the Rewards

Scrape is a decentralized scraping hub that delivers model-ready data for AI builders while rewarding users for contributing their IPs. Built on Solana, we bypass bot detection, cut costs, and save 4+ hours weekly, enabling scalable, GDPR-compliant data collection.

## Why Scrape?

AI builders need diverse, high-quality data, but bot detection and costly proxies like Zyte and Bright Data limit access. 67% of organizations lack trust in their data, 45% face inconsistent data, and 52% worry about data quality, wasting hours on manual cleanup. Scrape solves this with model-ready data (JSONL, TFRecords, Parquet), AI-driven semantic filtering, and a decentralized network.

## Features

* **Model-Ready Data:** Structured formats (JSONL, TFRecords, Parquet) for AI training.
* **Time Savings:** Automates cleanup, saving 4+ hours weekly.
* **Bot-Resistant:** Decentralized proxy network bypasses bot detection.
* **Cost Efficient:** Reduces data collection costs significantly.
* **User Rewards:** Earn tokens by contributing IPs as a node operator.
* **Ethical & Scalable:** GDPR-compliant, with revenue sharing for node operators.

## Installation

### For AI Builders

1. Visit [scrapit.fun](https://scrapit.fun) to try for free our chrome extension (available post-beta, September 2025).
2. Sign up and access model-ready data.

### For Node Operators

1. Install the Scrape Chrome extension (available post-beta, September 2025).
2. Share your bandwidth and earn token rewards.
3. Monitor earnings through the Scrape dashboard.

### For Developers

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/N-45div/scrape-breakout-solana.git
   cd scrape-breakout-solana
   ```

2. **Install Dependencies:**

   Ensure you have **Node.js**, **Solana CLI**, and **Anchor CLI** installed.

   ```bash
   npm install
   anchor --version
   solana --version
   ```

3. **Setup Solana Wallet:**

   Generate a new Solana keypair or import an existing one:

   ```bash
   solana-keygen new --outfile ~/.config/solana/id.json
   solana config set --keypair ~/.config/solana/id.json
   ```

4. **Deploy Programs:**

   Navigate to the program directory and deploy:

   ```bash
   anchor build
   ```

5. **Run the Backend:**

   Start the backend server:

   ```bash
   cd scrape-backend
   npm run build
   npm start
   ```

6. **Run the Extension:**

   Load the `scrape-extension` directory as an unpacked extension in your browser.
   
   ```bash
   cd scrape-extension
   pnpm i
   pnpm dev
   ```

7. **Launch the Landing Page:**

   ```bash
   cd scrape-landing
   npm install
   npm run dev
   ```

### Deployed Program (devnet)

Program id : `7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU`
Deployed link : [Click here](https://explorer.solana.com/address/7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU?cluster=devnet)

## User Journey 

![user](https://github.com/user-attachments/assets/68dccfca-6185-4582-8c17-70128ca8f29f)

## Contributing

We welcome contributions! To get started:

1. Fork the repository and create a branch:

   ```bash
   git checkout -b feature-name
   ```
2. Follow the coding guidelines in [CONTRIBUTING.md](https://github.com/N-45div/scrape-breakout-solana/blob/main/CONTRIBUTING.md).
3. Submit a pull request for review.


## Roadmap

* **May 2025:** Waitlist form released for testers.
* **August 2025:** Beta development with pre-market outreach.
* **September 2025:** Official beta release.
* **November 2025:** Full community launch.

## Team

Scrape is built by a team of experienced developers in decentralized infrastructure and AI, passionate about making data accessible for all.

## License

This project is licensed under the MIT License—see [LICENSE](https://github.com/N-45div/scrape-breakout-solana?tab=MIT-1-ov-file) for details.

## Contact

* Follow us on [X](https://x.com/scrapedotfun) for updates.
* Email us at [scrapit.fun@ud.me](mailto:scrapit.fun@ud.me).


