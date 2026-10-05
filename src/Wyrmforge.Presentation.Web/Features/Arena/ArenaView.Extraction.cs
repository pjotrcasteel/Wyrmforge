namespace Wyrmforge.Presentation.Web.Features.Arena;

public partial class ArenaView
{
    private int SecuredEssenceCount => simulation?.SecuredEssenceCount ?? 0;
    private double NextDepthScoreMultiplier => simulation?.NextDepthScoreMultiplier ?? CurrentScoreMultiplier;
}
