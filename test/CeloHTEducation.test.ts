import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployMockUSDm, fundAndApprove, FEES } from "./fixtures";

describe("CeloHTEducation", () => {
  async function deployFixture() {
    const [admin, treasury, student, other, issuer2] =
      await ethers.getSigners();
    const usdm = await deployMockUSDm();

    const Education = await ethers.getContractFactory("CeloHTEducation");
    const education = await Education.deploy(
      await usdm.getAddress(),
      treasury.address,
      FEES.certificate,
      admin.address,
    );

    return { admin, treasury, student, other, issuer2, usdm, education };
  }

  it("does not issue a certificate merely because a fee was paid", async () => {
    const { student, usdm, education } = await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate,
    );
    await education.connect(student).payCertificateFee(student.address);

    expect(await education.eligiblePayments(student.address)).to.equal(1);
    // No certificate exists yet.
    await expect(education.getCertificate(1)).to.be.reverted;
  });

  it("routes the certificate fee 100% to the treasury", async () => {
    const { treasury, student, usdm, education } =
      await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate,
    );
    await education.connect(student).payCertificateFee(student.address);
    expect(await usdm.balanceOf(treasury.address)).to.equal(FEES.certificate);
  });

  it("only an authorized issuer can issue, and issuance requires an eligible payment", async () => {
    const { admin, student, other, usdm, education } =
      await loadFixture(deployFixture);

    await expect(
      education.connect(other).issueCertificate(student.address, "ipfs://cert"),
    ).to.be.reverted;

    await expect(
      education.connect(admin).issueCertificate(student.address, "ipfs://cert"),
    ).to.be.revertedWithCustomError(education, "NoEligiblePayment");

    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate,
    );
    await education.connect(student).payCertificateFee(student.address);

    await expect(
      education.connect(admin).issueCertificate(student.address, "ipfs://cert"),
    )
      .to.emit(education, "CertificateIssued")
      .withArgs(1, student.address, admin.address, "ipfs://cert");

    expect(await education.eligiblePayments(student.address)).to.equal(0);
    expect(await education.isValidCertificate(1)).to.equal(true);
  });

  it("gives each certificate a unique ID", async () => {
    const { admin, student, usdm, education } =
      await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate * 2n,
    );
    await education.connect(student).payCertificateFee(student.address);
    await education.connect(student).payCertificateFee(student.address);

    await education.connect(admin).issueCertificate(student.address, "a");
    await education.connect(admin).issueCertificate(student.address, "b");

    const c1 = await education.getCertificate(1);
    const c2 = await education.getCertificate(2);
    expect(c1.certificateId).to.not.equal(c2.certificateId);
  });

  it("supports revocation and reflects it in isValidCertificate", async () => {
    const { admin, student, usdm, education } =
      await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate,
    );
    await education.connect(student).payCertificateFee(student.address);
    await education
      .connect(admin)
      .issueCertificate(student.address, "ipfs://cert");

    expect(await education.isValidCertificate(1)).to.equal(true);
    await expect(
      education.connect(admin).revokeCertificate(1, "duplicate issuance"),
    )
      .to.emit(education, "CertificateRevoked")
      .withArgs(1, admin.address, "duplicate issuance");
    expect(await education.isValidCertificate(1)).to.equal(false);

    await expect(
      education.connect(admin).revokeCertificate(1, "again"),
    ).to.be.revertedWithCustomError(education, "AlreadyRevoked");
  });

  it("admin can authorize and de-authorize additional issuers", async () => {
    const { admin, issuer2, student, usdm, education } =
      await loadFixture(deployFixture);
    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate,
    );
    await education.connect(student).payCertificateFee(student.address);

    await expect(
      education.connect(issuer2).issueCertificate(student.address, "x"),
    ).to.be.reverted;

    await education.connect(admin).setIssuerAuthorized(issuer2.address, true);
    await expect(
      education.connect(issuer2).issueCertificate(student.address, "x"),
    ).to.emit(education, "CertificateIssued");

    await education.connect(admin).setIssuerAuthorized(issuer2.address, false);
    await fundAndApprove(
      usdm,
      student,
      await education.getAddress(),
      FEES.certificate,
    );
    await education.connect(student).payCertificateFee(student.address);
    await expect(
      education.connect(issuer2).issueCertificate(student.address, "y"),
    ).to.be.reverted;
  });
});
