var logger = require('../utils/logtrace');
var schedule = require("../controllers/scheduler.controller");
var fileprocess = require("../controllers/file.processor.controller");
var agent = require("../controllers/agent.file.controller");
var psvideo = require("../controllers/ps.video.controller");

const watchWhatsappQueueInterval = 30;// sec
const watchAgentFileProcessInterval = 60;// sec
const watchpsvideoProcessInterval =60;
const watchCampaignQueueInterval = Number(process.env.WATCH_CAMPAIGN_QUEUE_INTERVAL) || 10; // 10 sec
exports.setupMainLoop = async function setupMainLoop() {
    watchWhatsappQueue();
    watchSMSQueue();
    watchEmailQueue();
    watchMessageQueue();
    watchUploadCustomerData();
    watchUploadCustomerData_LGI();
    AgentDataFileProcess();
    SendAgentDataFileToQuickcoms();
	campaignqueueProcess();
	//personalizedVideoProcess();
}

async function waitFor(seconds) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), seconds * 1000);
    });
}

async function watchUploadCustomerData(iteration = 1) {
    try {
        logger.info(`** watchUploadCustomerData [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await fileprocess.UploadCustomerData();

        await waitFor(watchWhatsappQueueInterval);
        watchUploadCustomerData(iteration + 1);
    } catch (err) {
        logger.error(`Error watching watchUploadCustomerData!`, err);
        watchUploadCustomerData();
    }
}

async function watchUploadCustomerData_LGI(iteration = 1) {
    try {
        logger.info(`** watchUploadCustomerData_LGI [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await fileprocess.Upload_LGI_CustomerData();

        await waitFor(watchWhatsappQueueInterval);
        watchUploadCustomerData_LGI(iteration + 1);
    } catch (err) {
        logger.error(`Error watching watchUploadCustomerData_LGI!`, err);
        watchUploadCustomerData_LGI();
    }
}

async function watchMessageQueue(iteration = 1) {
    try {
        logger.info(`** watchMessageQueue [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await schedule.processMessageQueue();

        await waitFor(watchWhatsappQueueInterval);
        watchMessageQueue(iteration + 1);
    } catch (err) {
        logger.error(`Error watching watchMessageQueue!`, err);
        watchMessageQueue();
    }
}

async function watchWhatsappQueue(iteration = 1) {
    try {
        logger.info(`** watchWhatsappQueue [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await schedule.scheduleWhatsApp();

        await waitFor(watchWhatsappQueueInterval);
        watchWhatsappQueue(iteration + 1);
    } catch (err) {
        logger.error(`Error watching watchWhatsappQueue!`, err);
        watchWhatsappQueue();
    }
}

async function watchSMSQueue(iteration = 1) {
    try {
        logger.info(`**watchSMSQueue [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await schedule.scheduleSMS();

        await waitFor(watchWhatsappQueueInterval);
        watchSMSQueue(iteration + 1);
    } catch (err) {
        logger.error(`Error watching watchSMSQueue!`, err);
        watchSMSQueue();
    }
}

async function watchEmailQueue(iteration = 1) {
    try {
        logger.info(`**watchEmailQueue [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await schedule.scheduleEMail();

        await waitFor(watchWhatsappQueueInterval);
        watchEmailQueue(iteration + 1);
    } catch (err) {
        logger.error(`Error watching watchEmailQueue!`, err);
        watchEmailQueue();
    }
}

async function AgentDataFileProcess(iteration = 1) {
    try {
        logger.info(`**AgentDataFileProcess [${iteration}] Running incoming watcher loop with ${watchAgentFileProcessInterval}s delay **`);

        await agent.agentfileProcess();

        await waitFor(watchAgentFileProcessInterval);
        AgentDataFileProcess(iteration + 1);
    } catch (err) {
        logger.error(`Error watching AgentDataFileProcess!`, err);
        AgentDataFileProcess();
    }
}

async function SendAgentDataFileToQuickcoms(iteration = 1) {
    try {
        logger.info(`**SendAgentDataFileToQuickcoms [${iteration}] Running incoming watcher loop with ${watchWhatsappQueueInterval}s delay **`);

        await agent.SendAgentData();

        await waitFor(watchWhatsappQueueInterval);
        SendAgentDataFileToQuickcoms(iteration + 1);
    } catch (err) {
        logger.error(`Error watching SendAgentDataFileToQuickcoms!`, err);
        SendAgentDataFileToQuickcoms();
    }
}

async function personalizedVideoProcess(iteration = 1) {
    try {
        logger.info(`**personalizedVideoProcess [${iteration}] Running incoming watcher loop with ${watchpsvideoProcessInterval}s delay **`);

        await psvideo.postdatatoPython();

        await waitFor(watchpsvideoProcessInterval);
        personalizedVideoProcess(iteration + 1);
    } catch (err) {
        logger.error(`Error watching personalizedVideoProcess!`, err);
        personalizedVideoProcess();
    }
}

async function campaignqueueProcess(iteration = 1) {
    try {
        logger.info(`**campaignqueueProcess [${iteration}] Running incoming watcher loop with ${watchCampaignQueueInterval}s delay **`);

		await schedule.processCampaignMessages();

        await waitFor(watchCampaignQueueInterval);
        campaignqueueProcess(iteration + 1);
    } catch (err) {
        logger.error(`Error watching campaignqueueProcess!`, err);
        campaignqueueProcess();
    }
}