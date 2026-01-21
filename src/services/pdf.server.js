const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("fontkit");
const fs = require("fs");
const con = require("../../config");
const path = require("path");

function hexToRgb(hex) {
	const bigint = parseInt(hex.replace("#", ""), 16);
	return {
		r: ((bigint >> 16) & 255) / 255,
		g: ((bigint >> 8) & 255) / 255,
		b: (bigint & 255) / 255,
	};
}

exports.overlayTextOnPDF = async (pdfPath, userData, campaignConfig) => {
	const pdfBytes = fs.readFileSync(pdfPath);
	const pdfDoc = await PDFDocument.load(pdfBytes);

	pdfDoc.registerFontkit(fontkit);

	const firstPage = pdfDoc.getPages()[0];

	let fonts = {};

	try {
		const montserratBoldBytes = fs.readFileSync(
			path.join(con.APP_ROOTDIR, "src/fonts/Montserrat-Bold.ttf")
		);
		const montserratRegularBytes = fs.readFileSync(
			path.join(con.APP_ROOTDIR, "src/fonts/Montserrat-Regular.ttf")
		);

		fonts = {
			Montserrat: await pdfDoc.embedFont(montserratRegularBytes),
			MontserratBold: await pdfDoc.embedFont(montserratBoldBytes),
		};
	} catch (err) {
		console.error("Error reading Montserrat font files:", err);
	}

	for (const overlay of campaignConfig.overlays) {
		if (overlay.type === "text") {
			let text = overlay.value.replace(/\{\{(.*?)\}\}/g, (_, key) => {
				key = key.trim();
				if (key === "templateData" && !userData[key]) {
					return userData.messageTemplate || "";
				}
				return userData[key] || "";
			});

			const color = hexToRgb(overlay.color || "#000000");

			const lines = text.split("\n");
			let yPos = firstPage.getHeight() - overlay.y;

			for (const line of lines) {
				firstPage.drawText(line, {
					x: overlay.x,
					y: yPos,
					size: overlay.size || 12,
					font: fonts[overlay.font] || fonts.Montserrat,
					color: rgb(color.r, color.g, color.b),
				});
				yPos -= (overlay.size || 12) + (overlay.lineSpacing || 4);
			}
		}

		if (overlay.type === "image") {
			const imgBytes = fs.readFileSync(overlay.path);
			let image;

			if (overlay.path.toLowerCase().endsWith(".png")) {
				image = await pdfDoc.embedPng(imgBytes);
			} else {
				image = await pdfDoc.embedJpg(imgBytes);
			}

			firstPage.drawImage(image, {
				x: overlay.x,
				y: firstPage.getHeight() - overlay.y - overlay.height,
				width: overlay.width,
				height: overlay.height,
			});
		}
	}

	return Buffer.from(await pdfDoc.save());
};



// const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
// const fs = require("fs");

// function hexToRgb(hex) {
// 	const bigint = parseInt(hex.replace("#", ""), 16);
// 	return {
// 		r: ((bigint >> 16) & 255) / 255,
// 		g: ((bigint >> 8) & 255) / 255,
// 		b: (bigint & 255) / 255,
// 	};
// }

// exports.overlayTextOnPDF = async (pdfPath, userData, campaignConfig) => {
// 	const pdfBytes = fs.readFileSync(pdfPath);
// 	const pdfDoc = await PDFDocument.load(pdfBytes);
// 	const firstPage = pdfDoc.getPages()[0];
// 	const fonts = {
// 		Helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
// 		HelveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
// 		TimesRoman: await pdfDoc.embedFont(StandardFonts.TimesRoman),
// 		TimesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
// 	};

// 	for (const overlay of campaignConfig.overlays) {
// 		if (overlay.type === "text") {
// 			let text = overlay.value.replace(/\{\{(.*?)\}\}/g, (_, key) => {
// 				key = key.trim();
// 				if (key === "templateData" && !userData[key]) {
// 					return userData.messageTemplate || "";
// 				}
// 				return userData[key] || "";
// 			});

// 			const color = hexToRgb(overlay.color || "#000000");

// 			firstPage.drawText(text, {
// 				x: overlay.x,
// 				y: firstPage.getHeight() - overlay.y,
// 				size: overlay.size || 12,
// 				font: fonts[overlay.font] || fonts.Helvetica,
// 				color: rgb(color.r, color.g, color.b),
// 			});
// 		}

// 		if (overlay.type === "image") {
// 			const imgBytes = fs.readFileSync(overlay.path);
// 			let image;

// 			if (overlay.path.toLowerCase().endsWith(".png")) {
// 				image = await pdfDoc.embedPng(imgBytes);
// 			} else {
// 				image = await pdfDoc.embedJpg(imgBytes);
// 			}

// 			firstPage.drawImage(image, {
// 				x: overlay.x,
// 				y: firstPage.getHeight() - overlay.y - overlay.height,
// 				width: overlay.width,
// 				height: overlay.height,
// 			});
// 		}

// 	}

// 	return Buffer.from(await pdfDoc.save());
// };

// const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
// const fs = require("fs");

// exports.overlayTextOnPDF = async (pdfPath, recipientName, candidateName, location, templateData)=>{
// 	const existingPdfBytes = fs.readFileSync(pdfPath);
// 	const pdfDoc = await PDFDocument.load(existingPdfBytes);
// 	const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
// 	const firstPage = pdfDoc.getPages()[0];

// 	firstPage.drawText(`Dear ${recipientName}`, {
// 		x: 40,
// 		y: firstPage.getHeight() - 150,
// 		size: 24,
// 		font,
// 		color: rgb(36 / 255, 51 / 255, 129 / 255),
// 	});

// 	firstPage.drawText(candidateName, {
// 		x: 40,
// 		y: firstPage.getHeight() - 200,
// 		size: 18,
// 		font,
// 		color: rgb(22 / 255, 126 / 255, 63 / 255),
// 	});

// 	firstPage.drawText(
// 		`from ${location} ${templateData}`,
// 		{ x: 40, y: firstPage.getHeight() - 222, size: 18, font, color: rgb(0, 0, 0) }
// 	);

// 	return Buffer.from(await pdfDoc.save());
// }