const pdf = require('html-pdf-node');
const InvoiceHelper = require('../utils/invoiceHelper');
const { s3Client } = require('../middleware/s3Upload');
const { PutObjectCommand ,DeleteObjectCommand } = require('@aws-sdk/client-s3');

class InvoiceService {
  constructor() {
    this.bucketName = process.env.LINODE_OBJECT_BUCKET || "leadkart";
  }

  async generateInvoice(booking) {
    try {
      const html = InvoiceHelper.getInvoiceHTML(booking);
      const pdfBuffer = await this.generatePDFBuffer(html);
      
      const invoiceUrl = await this.uploadInvoiceToS3(pdfBuffer, booking.invoiceNumber);
      
      return invoiceUrl;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw new Error('Failed to generate invoice');
    }
  }

  async  generatePDFBuffer(html) {
  try {
    const file = { content: html };
    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    };

    const pdfBuffer = await pdf.generatePdf(file, options);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF from HTML');
  }
}

  async uploadInvoiceToS3(pdfBuffer, invoiceNumber) {
    try {
      const fileName = `invoice_${invoiceNumber}_${Date.now()}.pdf`;
      const key = `TourTravels/INVOICES/${fileName}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ACL: 'public-read'
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      
      const endpoint = process.env.LINODE_OBJECT_STORAGE_ENDPOINT || "https://in-maa-1.linodeobjects.com";
      return `${endpoint}/${this.bucketName}/${key}`;
    } catch (error) {
      console.error('Error uploading invoice to S3:', error);
      throw new Error('Failed to upload invoice');
    }
  }

  async deleteInvoice(invoiceUrl) {
    try {
      const endpoint = process.env.LINODE_OBJECT_STORAGE_ENDPOINT || "https://in-maa-1.linodeobjects.com";
      const key = invoiceUrl.replace(`${endpoint}/${this.bucketName}/`, '');

      // const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      
      await s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      }));

      return true;
    } catch (error) {
      console.error('Error deleting invoice from S3:', error);
      throw new Error('Failed to delete invoice');
    }
  }
}

module.exports = InvoiceService;
