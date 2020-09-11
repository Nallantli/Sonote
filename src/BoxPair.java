public class BoxPair {
	private final int boxID;
	private final String code;

	public BoxPair(final int boxID, final String code) {
		this.boxID = boxID;
		this.code = code;
	}

	public int getBoxID() {
		return this.boxID;
	}

	public String getCode() {
		return this.code;
	}
}
