
const saveAccessToken = async (request, data, userId = 0) => {
  try {
    const { Cronofytoken } = request.getModels('xpaxr');
    
    const { access_token, account_id } = data || {};
    if (!access_token) {
      console.log("NO VALID TOKEN from Nylas:", data);
      return data;
    }
    const createdAt = new Date().toISOString();
    const cronofyTokenData = {
      userId,
      accountId: account_id,
      accessToken: access_token,
      refreshToken: "xpa",
      tokenType: null,
      expires: 0,
      // scope: null,
      createdAt
    };
    const ctokensRes = await Cronofytoken.upsert(
      cronofyTokenData,
      {
        where: {
          accessToken: access_token,
          userId
        }
      },
    );
    const ctokensRecord = ctokensRes[0];
    const ctokensInfo = ctokensRecord && ctokensRecord.toJSON();
    const { accessToken } = ctokensInfo || {};
    return { accessToken };
  } catch (err) {
    console.log("saveAccessTokenError:", err);
    return {
      error: {
        message: (err && err.message) || (err && err.detail)
      }
    };
  }
};


module.exports = {
  saveAccessToken,
}