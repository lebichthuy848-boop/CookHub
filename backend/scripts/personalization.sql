
-- CookHub personalization: additive, repeatable migration.
IF OBJECT_ID(N'dbo.UserPreferences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.UserPreferences (
        user_id NVARCHAR(20) NOT NULL PRIMARY KEY,
        answers NVARCHAR(MAX) NOT NULL CONSTRAINT DF_UserPreferences_answers DEFAULT N'{}',
        completed INT NOT NULL CONSTRAINT DF_UserPreferences_completed DEFAULT 0,
        survey_shown INT NOT NULL CONSTRAINT DF_UserPreferences_shown DEFAULT 0,
        CONSTRAINT FK_UserPreferences_User FOREIGN KEY (user_id)
            REFERENCES dbo.NguoiDung(MaNguoiDung) ON DELETE CASCADE,
        CONSTRAINT CK_UserPreferences_completed CHECK (completed IN (0, 1)),
        CONSTRAINT CK_UserPreferences_shown CHECK (survey_shown IN (0, 1))
    );
END;
GO
