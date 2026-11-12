// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @notice ERC-8004 Identity Registry methods used by CeloHT integrations.
/// @dev The deployed registry is maintained by the ERC-8004 project. This
///      interface does not implement or redeploy the registry.
interface IERC8004IdentityRegistry {
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    event Registered(
        uint256 indexed agentId,
        string agentURI,
        address indexed owner
    );
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event URIUpdated(
        uint256 indexed agentId,
        string newURI,
        address indexed updatedBy
    );
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function balanceOf(address owner) external view returns (uint256);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function register() external returns (uint256 agentId);

    function register(
        string calldata agentURI
    ) external returns (uint256 agentId);

    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId);

    function ownerOf(uint256 agentId) external view returns (address);

    function getApproved(uint256 agentId) external view returns (address);

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);

    function approve(address approved, uint256 agentId) external;

    function setApprovalForAll(address operator, bool approved) external;

    function transferFrom(address from, address to, uint256 agentId) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 agentId
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 agentId,
        bytes calldata data
    ) external;

    function tokenURI(uint256 agentId) external view returns (string memory);

    function setAgentURI(uint256 agentId, string calldata newURI) external;

    function isAuthorizedOrOwner(
        address spender,
        uint256 agentId
    ) external view returns (bool);

    function getMetadata(
        uint256 agentId,
        string calldata metadataKey
    ) external view returns (bytes memory);

    function setMetadata(
        uint256 agentId,
        string calldata metadataKey,
        bytes calldata metadataValue
    ) external;

    function getAgentWallet(uint256 agentId) external view returns (address);

    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function unsetAgentWallet(uint256 agentId) external;
}
