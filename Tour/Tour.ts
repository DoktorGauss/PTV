class Tour {
    name: string;
    id: number;
    marker: Stops[];
    value: number;

    constructor(Iname: string, Iid: number) {
        this.name = Iname;
        this.id = Iid;
        this.value = 0.0;
    }

}