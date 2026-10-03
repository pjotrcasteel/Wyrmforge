namespace Wyrmforge.Domain.Combat.Geometry;

public readonly record struct Vector2D(double X, double Y)
{
    public static Vector2D Zero => new(0, 0);

    public double Length => Math.Sqrt((X * X) + (Y * Y));

    public Vector2D Normalized()
    {
        var length = Length;
        return length <= double.Epsilon ? Zero : new Vector2D(X / length, Y / length);
    }

    public static double Distance(Vector2D left, Vector2D right) => (right - left).Length;

    public static Vector2D DirectionTo(Vector2D from, Vector2D to) => (to - from).Normalized();

    public static Vector2D Rotate(Vector2D vector, double radians)
    {
        var cos = Math.Cos(radians);
        var sin = Math.Sin(radians);
        return new Vector2D((vector.X * cos) - (vector.Y * sin), (vector.X * sin) + (vector.Y * cos));
    }

    public static Vector2D operator +(Vector2D left, Vector2D right) => new(left.X + right.X, left.Y + right.Y);

    public static Vector2D operator -(Vector2D left, Vector2D right) => new(left.X - right.X, left.Y - right.Y);

    public static Vector2D operator *(Vector2D vector, double scalar) => new(vector.X * scalar, vector.Y * scalar);
}
