(function(window, document) {
  function createDonationButton(config) {
    const button = document.createElement('button');
    button.id = 'crypto-donate-btn';
    button.textContent = config.buttonText || 'Donate Now';
    button.style.cssText = `
      background-color: ${config.buttonColor || '#892BE2'};
      color: white;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease-in-out;
    `;
    return button;
  }

  const chainOptions = [
    { id: 10, name: 'Optimism' },
    { id: 8453, name: 'Base' },
    { id: 42220, name: 'Celo' },
  ];

  function createModal(config, uniswapTokens, currentChain) {
    const modal = document.createElement('div');
    modal.id = 'crypto-donate-modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.5);
    `;

    const chainSelectHtml = chainOptions
      .map(chain => `<option value="${chain.id}"${chain.id === currentChain.id ? ' selected' : ''}>${chain.name}</option>`)
      .join('');

    const tokenSelectHtml = Object.entries(uniswapTokens)
      .map(([symbol, token]) => `<option value="${symbol}">${token.name} (${symbol})</option>`)
      .join('');

    modal.innerHTML = `
      <div style="background-color: white; margin: 10% auto; padding: 20px; border-radius: 10px; width: 80%; max-width: 500px;">
        <h2 id="crypto-donate-modal-title" style="color: #892BE2; font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">${config.modalTitle || 'Make a Donation'}</h2>
        <div style="margin-bottom: 1rem;">
          <label for="crypto-donate-wallet-address" style="display: block; margin-bottom: 0.5rem; color: #4b5563;">Wallet Address (this address will be receiving the hypercert)</label>
          <input id="crypto-donate-wallet-address" type="text" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: #f3f4f6;">
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="crypto-donate-chain" style="display: block; margin-bottom: 0.5rem; color: #4b5563;">Select Chain</label>
          <select id="crypto-donate-chain" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: #f3f4f6;">
            ${chainSelectHtml}
          </select>
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="crypto-donate-token" style="display: block; margin-bottom: 0.5rem; color: #4b5563;">Select Token</label>
          <select id="crypto-donate-token" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.25rem; background-color: #f3f4f6;">
            ${tokenSelectHtml}
          </select>
        </div>
        <div style="margin-bottom: 1rem;">
          <label for="crypto-donate-amount" style="display: block; margin-bottom: 0.5rem; color: #4b5563;">Donation Amount</label>
          <input id="crypto-donate-amount" type="number" step="0.01" placeholder="Enter amount" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.25rem;">
        </div>
        <button id="crypto-donate-submit" style="
          background-color: #8A2BE2;
          color: white;
          border: none;
          padding: 10px 20px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          border-radius: 5px;
          transition: background-color 0.3s ease;
        ">Donate</button>
        <button id="crypto-donate-close" style="display: block; margin-top: 1rem; padding: 0.5rem 1rem; background-color: #f3f4f6; border: none; border-radius: 0.25rem; cursor: pointer;">Close</button>
      </div>
    `;

    const submitButton = modal.querySelector('#crypto-donate-submit');
    submitButton.onmouseover = function() {
      this.style.backgroundColor = '#9B30FF'; // Lighter purple on hover
    };
    submitButton.onmouseout = function() {
      this.style.backgroundColor = '#8A2BE2'; // Back to original purple
    };

    return modal;
  }

  const contractABI = [
    {
      "inputs": [],
      "name": "USDC",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
        "name": "destinationChain",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "destinationAddress",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "hcRecipientAddress",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "_splitsAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_hypercertFractionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "inputTokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "sendDonation",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "UNISWAP_V3_FACTORY",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
      "type": "function"
    }
  ]

  async function initializeDonation(config) {
    if (typeof window.ethereum === 'undefined') {
      console.error('Ethereum provider not found. Please install MetaMask.');
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    // Get the current chain ID
    const network = await provider.getNetwork();
    let chainId = network.chainId;

    const contract = new ethers.Contract(config.contractAddress, contractABI, signer);

    // Fetch user's tokens and check Uniswap pools
    let uniswapTokens = await fetchUserTokensAndUniswapPools(provider, userAddress, chainId, contract);

    const button = createDonationButton(config);
    const modal = createModal(config, uniswapTokens, { id: chainId, name: getChainName(chainId) });
    document.body.appendChild(button);
    document.body.appendChild(modal);

    const walletAddressInput = document.getElementById('crypto-donate-wallet-address');
    const totalRaisedInput = document.getElementById('crypto-donate-total-raised');
    const donationAmountInput = document.getElementById('crypto-donate-amount');
    const submitButton = document.getElementById('crypto-donate-submit');
    const closeButton = document.getElementById('crypto-donate-close');

    async function updateButtonState() {
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        button.textContent = 'Connect Wallet';
        button.onclick = connectWallet;
      } else {
        button.textContent = config.buttonText || 'Donate Now';
        button.onclick = openModal;
      }
    }

    async function connectWallet() {
      try {
        await provider.send("eth_requestAccounts", []);
        updateButtonState();
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        alert("Failed to connect wallet. Please try again.");
      }
    }

    async function openModal() {
      try {
        const address = await signer.getAddress();
        walletAddressInput.value = address;

        modal.style.display = 'block';
      } catch (error) {
        console.error("Failed to open modal:", error);
        alert("Failed to fetch donation information. Please try again.");
      }
    }

    function closeModal() {
      modal.style.display = 'none';
      donationAmountInput.value = '';
    }[]

    async function submitDonation() {
      const amount = donationAmountInput.value;
      if (!amount) return;

      const tokenSelect = document.getElementById('crypto-donate-token');
      const selectedToken = tokenSelect.value;
      const inputTokenAddress = uniswapTokens[selectedToken].address;

      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';

      try {
        let tx;
        if (selectedToken === 'native') {
          // For native token transactions
          tx = await contract.sendDonation(
            config.destinationChain,
            config.destinationAddress,
            walletAddressInput.value,
            config.splitsAddress,
            config.hypercertFractionId,
            ethers.constants.AddressZero, // Use zero address for native token
            ethers.utils.parseEther(amount),
            { 
              value: ethers.utils.parseEther(amount),
              gasLimit: 300000 // Adjust this value based on your contract's gas requirements
            }
          );
        } else {
          // For ERC20 token transactions
          const tokenContract = new ethers.Contract(
            inputTokenAddress,
            [
              'function approve(address spender, uint256 amount) public returns (bool)',
              'function allowance(address owner, address spender) public view returns (uint256)'
            ],
            signer
          );

          const donationAmount = ethers.utils.parseUnits(amount, uniswapTokens[selectedToken].decimals);
          
          // Check current allowance
          const currentAllowance = await tokenContract.allowance(await signer.getAddress(), contract.address);

          // If current allowance is less than donation amount, request approval
          if (currentAllowance.lt(donationAmount)) {
            const approveTx = await tokenContract.approve(contract.address, donationAmount);
            await approveTx.wait();
          }

          // Send the donation
          tx = await contract.sendDonation(
            config.destinationChain,
            config.destinationAddress,
            walletAddressInput.value,
            config.splitsAddress,
            config.hypercertFractionId,
            inputTokenAddress,
            donationAmount,
            { gasLimit: 300000,
              value: BigInt(1000000000000000)
             } // Adjust this value based on your contract's gas requirements
          );
        }

        await tx.wait();
        alert("Donation successful!");
        closeModal();
      } catch (error) {
        console.error("Donation failed:", error);
        alert("Donation failed. Please try again.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Donate';
      }
    }

    updateButtonState();
    closeButton.onclick = closeModal;
    submitButton.onclick = submitDonation;

    const tokenSelect = document.getElementById('crypto-donate-token');
    tokenSelect.addEventListener('change', updateInputTokenAddress);

    function updateInputTokenAddress() {
      const selectedToken = tokenSelect.value;
      config.inputTokenAddress = uniswapTokens[selectedToken]?.address || config.inputTokenAddress;
    }

    const chainSelect = document.getElementById('crypto-donate-chain');
    chainSelect.addEventListener('change', async () => {
      const newChainId = parseInt(chainSelect.value);
      if (newChainId !== chainId) {
        try {
          await switchChain(newChainId);
          chainId = newChainId;
          uniswapTokens = await fetchUserTokensAndUniswapPools(provider, userAddress, chainId, contract);
          updateTokenSelect(uniswapTokens);
        } catch (error) {
          console.error('Failed to switch chain:', error);
          chainSelect.value = chainId;
        }
      }
    });
  }

  async function fetchUserTokensAndUniswapPools(provider, userAddress, chainId, contract) {
    const tokens = { 'native': getNativeToken(chainId) };
    
    // Fetch user's ERC20 tokens
    const userTokens = await fetchUserERC20Tokens(provider, userAddress, chainId);
    
    try {
      // Get USDC address from the contract
      const stablecoinAddress = await contract.USDC();
      
      // Get Uniswap V3 Factory address from the contract
      const factoryAddress = await contract.UNISWAP_V3_FACTORY();
      
      const factory = new ethers.Contract(
        factoryAddress,
        ['function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'],
        provider
      );

      for (const token of userTokens) {
        try {
          // Check if there's a pool with the stablecoin for this token
          const poolAddress = await factory.getPool(stablecoinAddress, token.address, 3000); // 3000 represents 0.3% fee tier
          
          if (poolAddress !== ethers.constants.AddressZero) {
            tokens[token.symbol] = {
              symbol: token.symbol,
              name: token.name,
              address: token.address,
            };
          }
        } catch (error) {
          console.error(`Error checking pool for ${token.symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses from contract:', error);
    }

    return tokens;
  }

  async function fetchUserERC20Tokens(provider, userAddress, chainId) {
    const apiUrl = getExplorerApiUrl(chainId);
    const apiKey = getExplorerApiKey(chainId);

    if (!apiUrl || !apiKey) {
      console.error('Unsupported chain');
      return [];
    }

    const url = `${apiUrl}?module=account&action=tokentx&address=${userAddress}&startblock=0&endblock=999999999&sort=asc&apikey=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== '1') {
        throw new Error('Explorer API request failed');
      }

      const uniqueTokens = new Set();
      const userTokens = [];

      for (const tx of data.result) {
        if (!uniqueTokens.has(tx.contractAddress)) {
          uniqueTokens.add(tx.contractAddress);
          userTokens.push({
            address: tx.contractAddress,
            symbol: tx.tokenSymbol,
            name: tx.tokenName
          });
        }
      }

      // Check balances and filter out tokens with zero balance
      const tokensWithBalance = [];
      for (const token of userTokens) {
        const contract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        );

        const balance = await contract.balanceOf(userAddress);
        
        if (balance.gt(0)) {
          tokensWithBalance.push(token);
        }
      }

      return tokensWithBalance;
    } catch (error) {
      console.error('Failed to fetch user ERC20 tokens:', error);
      return [];
    }
  }

  function getNativeToken(chainId) {
    const nativeTokens = {
      10: { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
      8453: { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000' },
      42220: { symbol: 'CELO', name: 'Celo', address: '0x0000000000000000000000000000000000000000' },
    };
    return nativeTokens[chainId] || { symbol: 'NATIVE', name: 'Native Token', address: '0x0000000000000000000000000000000000000000' };
  }

  function getExplorerApiUrl(chainId) {
    const apiUrls = {
      10: 'https://api-optimistic.etherscan.io/api',
      8453: 'https://api.basescan.org/api',
      42220: 'https://api.celoscan.io/api',
    };
    return apiUrls[chainId];
  }

  function getExplorerApiKey(chainId) {
    const apiKeys = {
      10: 'OPTIMISM_API_KEY',
      8453: 'BASE_API_KEY',
      42220: 'CELO_API_KEY',
    };
    return apiKeys[chainId];
  }

  async function getCurrentChain(provider) {
    try {
      const network = await provider.getNetwork();
      const chainId = network.chainId;
      const chains = {
        1: { id: 'ethereum', name: 'Ethereum' },
        56: { id: 'binance', name: 'Binance Smart Chain' },
        137: { id: 'polygon', name: 'Polygon' },
        // Add more chains as needed
      };
      return chains[chainId] || { id: 'unknown', name: 'Unknown Chain' };
    } catch (error) {
      console.error('Failed to get current chain:', error);
      return { id: 'unknown', name: 'Unknown Chain' };
    }
  }

  async function switchChain(chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [getChainParams(chainId)],
          });
        } catch (addError) {
          throw new Error('Failed to add the network to MetaMask');
        }
      } else {
        throw new Error('Failed to switch network in MetaMask');
      }
    }
  }

  function getChainParams(chainId) {
    const chains = {
      10: {
        chainId: '0xA',
        chainName: 'Optimism',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.optimism.io'],
        blockExplorerUrls: ['https://optimistic.etherscan.io'],
      },
      8453: {
        chainId: '0x2105',
        chainName: 'Base',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
      },
      42220: {
        chainId: '0xA4EC',
        chainName: 'Celo',
        nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
        rpcUrls: ['https://forno.celo.org'],
        blockExplorerUrls: ['https://explorer.celo.org'],
      },
    };
    return chains[chainId];
  }

  function getChainName(chainId) {
    const chain = chainOptions.find(chain => chain.id === chainId);
    return chain ? chain.name : 'Unknown Chain';
  }

  function updateTokenSelect(uniswapTokens) {
    const tokenSelect = document.getElementById('crypto-donate-token');
    tokenSelect.innerHTML = Object.entries(uniswapTokens)
      .map(([symbol, token]) => `<option value="${symbol}">${token.name} (${symbol})</option>`)
      .join('');
  }

  window.initCryptoDonation = initializeDonation;
})(window, document);
