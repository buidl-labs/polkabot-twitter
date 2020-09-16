# PolkaBot Twitter

Distributing information about incentives for participating in the Polkadot ecosystem. Starting with Kusama.

## Table of contents

- [Currently supported networks](#supported_networks)
- [Development](#development)
  - [Pre-requisites](#development-pre-requisites)
  - [Installation Instructions](#installation)
  - [Dependencies](#dependencies)
- [Gratitude](#gratitude)

## Currently supported networks <a name = "supported_networks"></a>

- [Kusama Network](https://kusama.network/)

## Development <a name = "development"></a>

### Pre-requisites <a name = "usage-pre-requisites"></a>

- A twitter account for the bot.
- Twitter API access
  - Apply for API access at developer.twitter.com

### Getting Started

- Clone the repository:
  ```bash
  git clone https://github.com/buidl-labs/polkabot-twitter.git
  ```
- cd into the `backend` folder inside main folder:
  ```bash
  cd polkabot-twitter/backend
  ```
- Add environment variables in `.env` file

  ```env
  TWITTER_CONSUMER_KEY=your_twitter_consumer_key
    TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret_key
    TWITTER_ACCESS_TOKEN=your_twitter_access_token
    TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_secret_token

  ```

- Install the dependencies with:

  ```
  npm install
  ```

- Run the development server:

  ```bash
  npm start
  ```
  
  The top validator page should be available on http://localhost:3000/#/top-validator and the top nominator page on http://localhost:3000/#/top-nominator

## Gratitude <a name = "gratitude"></a>

![](https://github.com/buidl-labs/polkadot-chains-indexer/blob/master/.github/web3%20foundation_grants_badge_black.png)
