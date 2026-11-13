// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev Test-only ownership fixture. It does not emulate ERC-8004 transactions
///      or stand in for the official registry in deployment configuration.
contract MockERC8004IdentityRegistry {
    mapping(uint256 agentId => address owner) private _owners;
    mapping(uint256 agentId => address operator) private _operators;

    function supportsInterface(
        bytes4 interfaceId
    ) external pure returns (bool) {
        return interfaceId == 0x80ac58cd;
    }

    function mint(address owner, uint256 agentId) external {
        require(owner != address(0), "zero owner");
        require(_owners[agentId] == address(0), "already minted");
        _owners[agentId] = owner;
    }

    function transfer(uint256 agentId, address newOwner) external {
        require(_owners[agentId] == msg.sender, "not owner");
        require(newOwner != address(0), "zero owner");
        _owners[agentId] = newOwner;
        delete _operators[agentId];
    }

    function approve(address operator, uint256 agentId) external {
        require(_owners[agentId] == msg.sender, "not owner");
        _operators[agentId] = operator;
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        address owner = _owners[agentId];
        require(owner != address(0), "unknown agent");
        return owner;
    }

    function isAuthorizedOrOwner(
        address spender,
        uint256 agentId
    ) external view returns (bool) {
        address owner = _owners[agentId];
        require(owner != address(0), "unknown agent");
        return owner == spender || _operators[agentId] == spender;
    }
}
