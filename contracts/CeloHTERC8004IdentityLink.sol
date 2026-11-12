// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {ICeloHTAgentRegistry} from "./interfaces/ICeloHTAgentRegistry.sol";
import {IERC8004IdentityRegistry} from "./interfaces/IERc8004IdentityRegistry.sol";

/// @title CeloHTERC8004IdentityLink
/// @notice Links an existing CeloHT agent to an agent minted in the official
///         ERC-8004 Identity Registry without changing either registry.
/// @dev The caller must be the registered CeloHT wallet, which must own or be
///      an approved ERC-8004 operator for the identity. ERC-8004 transfers do
///      not transfer the CeloHT registration; stale links can be cleared by
///      the registered CeloHT wallet.
contract CeloHTERC8004IdentityLink {
    struct AgentLink {
        uint256 erc8004AgentId;
        bool linked;
    }

    ICeloHTAgentRegistry public immutable celoHTAgentRegistry;
    IERC8004IdentityRegistry public immutable identityRegistry;

    mapping(uint256 celoHTAgentId => AgentLink) private _celoHTLinks;
    mapping(uint256 erc8004AgentId => uint256 celoHTAgentIdPlusOne)
        private _erc8004Links;

    event AgentIdentityLinked(
        uint256 indexed celoHTAgentId,
        uint256 indexed erc8004AgentId,
        address indexed wallet
    );
    event AgentIdentityUnlinked(
        uint256 indexed celoHTAgentId,
        uint256 indexed erc8004AgentId,
        address indexed wallet
    );

    error ZeroAddress();
    error AddressHasNoCode(address target);
    error AgentInactive(uint256 celoHTAgentId);
    error NotCeloHTAgentWallet(uint256 celoHTAgentId, address caller);
    error NotERC8004AgentAuthorized(uint256 erc8004AgentId, address caller);
    error CeloHTAgentAlreadyLinked(uint256 celoHTAgentId);
    error ERC8004AgentAlreadyLinked(uint256 erc8004AgentId);
    error AgentNotLinked(uint256 celoHTAgentId);

    constructor(address celoHTRegistry, address erc8004IdentityRegistry) {
        if (
            celoHTRegistry == address(0) ||
            erc8004IdentityRegistry == address(0)
        ) {
            revert ZeroAddress();
        }
        if (celoHTRegistry.code.length == 0) {
            revert AddressHasNoCode(celoHTRegistry);
        }
        if (erc8004IdentityRegistry.code.length == 0) {
            revert AddressHasNoCode(erc8004IdentityRegistry);
        }

        celoHTAgentRegistry = ICeloHTAgentRegistry(celoHTRegistry);
        identityRegistry = IERC8004IdentityRegistry(erc8004IdentityRegistry);
    }

    function linkAgentIdentity(
        uint256 celoHTAgentId,
        uint256 erc8004AgentId
    ) external {
        ICeloHTAgentRegistry.Agent memory agent = celoHTAgentRegistry.getAgent(
            celoHTAgentId
        );
        if (!agent.active) revert AgentInactive(celoHTAgentId);
        if (agent.wallet != msg.sender) {
            revert NotCeloHTAgentWallet(celoHTAgentId, msg.sender);
        }
        if (_celoHTLinks[celoHTAgentId].linked) {
            revert CeloHTAgentAlreadyLinked(celoHTAgentId);
        }
        if (_erc8004Links[erc8004AgentId] != 0) {
            revert ERC8004AgentAlreadyLinked(erc8004AgentId);
        }
        if (
            !identityRegistry.isAuthorizedOrOwner(agent.wallet, erc8004AgentId)
        ) {
            revert NotERC8004AgentAuthorized(erc8004AgentId, agent.wallet);
        }

        _celoHTLinks[celoHTAgentId] = AgentLink({
            erc8004AgentId: erc8004AgentId,
            linked: true
        });
        _erc8004Links[erc8004AgentId] = celoHTAgentId + 1;

        emit AgentIdentityLinked(celoHTAgentId, erc8004AgentId, msg.sender);
    }

    /// @notice Clears a link, including one made stale by an ERC-721 transfer.
    /// @dev The registered CeloHT wallet remains the authority for its own
    ///      mapping; the next link still requires current ownership of both IDs.
    function unlinkAgentIdentity(uint256 celoHTAgentId) external {
        ICeloHTAgentRegistry.Agent memory agent = celoHTAgentRegistry.getAgent(
            celoHTAgentId
        );
        if (agent.wallet != msg.sender) {
            revert NotCeloHTAgentWallet(celoHTAgentId, msg.sender);
        }

        AgentLink memory link = _celoHTLinks[celoHTAgentId];
        if (!link.linked) revert AgentNotLinked(celoHTAgentId);

        delete _celoHTLinks[celoHTAgentId];
        delete _erc8004Links[link.erc8004AgentId];

        emit AgentIdentityUnlinked(
            celoHTAgentId,
            link.erc8004AgentId,
            msg.sender
        );
    }

    function getERC8004AgentId(
        uint256 celoHTAgentId
    ) external view returns (bool linked, uint256 erc8004AgentId) {
        AgentLink memory link = _celoHTLinks[celoHTAgentId];
        return (link.linked, link.erc8004AgentId);
    }

    function getCeloHTAgentId(
        uint256 erc8004AgentId
    ) external view returns (bool linked, uint256 celoHTAgentId) {
        uint256 celoHTAgentIdPlusOne = _erc8004Links[erc8004AgentId];
        if (celoHTAgentIdPlusOne == 0) return (false, 0);
        return (true, celoHTAgentIdPlusOne - 1);
    }

    /// @notice Checks whether a stored link still has the same owner on both
    ///         registries. ERC-721 transfers can make a link stale.
    function isLinkOwnerCurrent(
        uint256 celoHTAgentId
    ) external view returns (bool) {
        AgentLink memory link = _celoHTLinks[celoHTAgentId];
        if (!link.linked) return false;

        ICeloHTAgentRegistry.Agent memory agent = celoHTAgentRegistry.getAgent(
            celoHTAgentId
        );
        return
            agent.active &&
            identityRegistry.isAuthorizedOrOwner(
                agent.wallet,
                link.erc8004AgentId
            );
    }
}
