import { checkSingleLink } from "../utils/linkCheck.js";

export const getLinkCheck = async (req, res) => {
    try {
        const payload = req.body;
        if (!Array.isArray(payload)) {
            const result = await checkSingleLink(payload);
            console.log('result', result)
            return res.json(result);
        }
        const BATCH_SIZE = 8; 
        const results = [];

        for (let i = 0; i < payload.length; i += BATCH_SIZE) {
            const batch = payload.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.all(
                batch.map((item) =>
                    checkSingleLink(item).catch(() => ({
                        success: false,
                        status: "Website failed",
                    }))
                )
            );

            results.push(...batchResults);
        }

        return res.json({
            success: true,
            data: results,
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            status: "Server error",
        });
    }
};
